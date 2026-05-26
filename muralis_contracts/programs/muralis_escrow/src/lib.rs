//! Muralis — USDC/PYUSD Funding Escrow
//!
//! Per-project escrow that holds contributor funds (USDC SPL Token, but works with
//! any SPL Token mint passed at init — so PYUSD is also supported on Devnet/Mainnet)
//! until the project's funding target is reached, then releases the entire vault
//! balance to the artist.
//!
//! Instruction flow:
//!
//!   1. `initialize_escrow(project_id, target, deadline)`
//!         — artist creates the escrow + vault PDAs for their project
//!
//!   2. `contribute(amount)`           — supporters call N times
//!         — transfers USDC from contributor's ATA into the project vault
//!         — when raised >= target, status flips to Funded
//!
//!   3. `release()`                    — artist withdraws when Funded
//!         — transfers full vault balance to artist's ATA
//!         — status becomes Released
//!
//! Notes for v2 (post-hackathon):
//!   - `refund()` flow if deadline passes without target met (requires per-contribution
//!     accounting; current MVP only tracks totals + events).
//!   - Multisig upgrade authority before Mainnet.
//!   - Chainlink price feed (USDC/USD) for off-chain audit-grade reporting.
//!
//! Network: Devnet for hackathon; Mainnet after audit.

use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

declare_id!("2fqfbWq6ZQkonqiN6UnpXKXdvr4HzLqSXi3XE5UrBLfR");

// ─────────────────────────────────────────────────────────────────────────
// Program
// ─────────────────────────────────────────────────────────────────────────

#[program]
pub mod muralis_escrow {
    use super::*;

    /// Initialize an escrow + token vault for a new project.
    ///
    /// PDAs created (seeded by `project_id`):
    ///   - EscrowState: stores target, raised, status, artist, mint
    ///   - Vault: SPL TokenAccount owned by the EscrowState PDA
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        project_id: String,
        target_amount: u64,
        deadline_ts: i64,
    ) -> Result<()> {
        require!(
            !project_id.is_empty() && project_id.len() <= 64,
            EscrowError::InvalidProjectId
        );
        require!(target_amount > 0, EscrowError::InvalidTarget);
        require!(
            deadline_ts > Clock::get()?.unix_timestamp,
            EscrowError::InvalidDeadline
        );

        let state = &mut ctx.accounts.escrow_state;
        state.project_id = project_id.clone();
        state.artist = ctx.accounts.artist.key();
        state.target_amount = target_amount;
        state.raised_amount = 0;
        state.deadline_ts = deadline_ts;
        state.payment_mint = ctx.accounts.payment_mint.key();
        state.vault = ctx.accounts.vault.key();
        state.status = EscrowStatus::Active;
        state.bump = ctx.bumps.escrow_state;

        emit!(EscrowInitialized {
            project_id,
            artist: state.artist,
            target_amount,
            deadline_ts,
            payment_mint: state.payment_mint,
        });

        Ok(())
    }

    /// Contribute USDC/PYUSD to a project's escrow vault.
    ///
    /// Validates the escrow is active and within the deadline, then transfers
    /// `amount` from the contributor's ATA into the vault. When the running
    /// total reaches the target, the escrow auto-transitions to `Funded`.
    pub fn contribute(ctx: Context<Contribute>, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::ZeroContribution);

        let state = &mut ctx.accounts.escrow_state;
        require!(
            matches!(state.status, EscrowStatus::Active),
            EscrowError::EscrowNotActive
        );
        require!(
            Clock::get()?.unix_timestamp < state.deadline_ts,
            EscrowError::DeadlinePassed
        );
        require!(
            ctx.accounts.payment_mint.key() == state.payment_mint,
            EscrowError::MintMismatch
        );

        // CPI: transfer SPL Token from contributor → vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.contributor_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.contributor.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        transfer(cpi_ctx, amount)?;

        state.raised_amount = state
            .raised_amount
            .checked_add(amount)
            .ok_or(EscrowError::Overflow)?;

        if state.raised_amount >= state.target_amount {
            state.status = EscrowStatus::Funded;
        }

        emit!(ContributionMade {
            project_id: state.project_id.clone(),
            contributor: ctx.accounts.contributor.key(),
            amount,
            new_total: state.raised_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Release the full vault balance to the artist.
    ///
    /// Can only be called when status == Funded. Uses the EscrowState PDA as
    /// the signing authority for the vault token account (CPI with seeds).
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let state_key = ctx.accounts.escrow_state.key();
        let state = &ctx.accounts.escrow_state;
        require!(
            matches!(state.status, EscrowStatus::Funded),
            EscrowError::TargetNotReached
        );
        require!(
            ctx.accounts.artist.key() == state.artist,
            EscrowError::Unauthorized
        );
        require!(
            ctx.accounts.artist_token_account.mint == state.payment_mint,
            EscrowError::MintMismatch
        );

        let project_id_bytes = state.project_id.as_bytes();
        let bump = state.bump;
        let seeds: &[&[u8]] = &[b"escrow", project_id_bytes, &[bump]];
        let signer: &[&[&[u8]]] = &[seeds];

        let amount = ctx.accounts.vault.amount;

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.artist_token_account.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        transfer(cpi_ctx, amount)?;

        let state = &mut ctx.accounts.escrow_state;
        state.status = EscrowStatus::Released;

        emit!(FundsReleased {
            project_id: state.project_id.clone(),
            artist: state.artist,
            amount,
            timestamp: Clock::get()?.unix_timestamp,
            escrow: state_key,
        });

        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct EscrowState {
    #[max_len(64)]
    pub project_id: String,
    pub artist: Pubkey,
    pub target_amount: u64,
    pub raised_amount: u64,
    pub deadline_ts: i64,
    pub payment_mint: Pubkey, // USDC or PYUSD (set at init)
    pub vault: Pubkey,
    pub status: EscrowStatus,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EscrowStatus {
    Active,
    Funded,
    Released,
}

// ─────────────────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(project_id: String)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub artist: Signer<'info>,

    /// CHECK: PDA — uniqueness enforced by seeds; one escrow per project_id.
    #[account(
        init,
        payer = artist,
        space = 8 + EscrowState::INIT_SPACE,
        seeds = [b"escrow", project_id.as_bytes()],
        bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        init,
        payer = artist,
        seeds = [b"vault", project_id.as_bytes()],
        bump,
        token::mint = payment_mint,
        token::authority = escrow_state,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub payment_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_state.project_id.as_bytes()],
        bump = escrow_state.bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"vault", escrow_state.project_id.as_bytes()],
        bump,
        token::mint = payment_mint,
        token::authority = escrow_state,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = contributor_token_account.mint == payment_mint.key() @ EscrowError::MintMismatch,
        constraint = contributor_token_account.owner == contributor.key() @ EscrowError::Unauthorized,
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,

    pub payment_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut)]
    pub artist: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_state.project_id.as_bytes()],
        bump = escrow_state.bump,
        has_one = artist @ EscrowError::Unauthorized,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"vault", escrow_state.project_id.as_bytes()],
        bump,
        token::authority = escrow_state,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = artist_token_account.owner == artist.key() @ EscrowError::Unauthorized,
    )]
    pub artist_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ─────────────────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────────────────

#[event]
pub struct EscrowInitialized {
    pub project_id: String,
    pub artist: Pubkey,
    pub target_amount: u64,
    pub deadline_ts: i64,
    pub payment_mint: Pubkey,
}

#[event]
pub struct ContributionMade {
    pub project_id: String,
    pub contributor: Pubkey,
    pub amount: u64,
    pub new_total: u64,
    pub timestamp: i64,
}

#[event]
pub struct FundsReleased {
    pub project_id: String,
    pub artist: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub escrow: Pubkey,
}

// ─────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────

#[error_code]
pub enum EscrowError {
    #[msg("Project ID must be between 1 and 64 characters.")]
    InvalidProjectId,
    #[msg("Target amount must be greater than zero.")]
    InvalidTarget,
    #[msg("Deadline must be in the future.")]
    InvalidDeadline,
    #[msg("Contribution amount must be greater than zero.")]
    ZeroContribution,
    #[msg("Escrow is not active.")]
    EscrowNotActive,
    #[msg("Deadline has passed.")]
    DeadlinePassed,
    #[msg("Funding target has not been reached yet.")]
    TargetNotReached,
    #[msg("Payment mint does not match the escrow configuration.")]
    MintMismatch,
    #[msg("Unauthorized signer.")]
    Unauthorized,
    #[msg("Arithmetic overflow.")]
    Overflow,
}
