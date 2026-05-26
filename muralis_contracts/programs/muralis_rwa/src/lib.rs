//! Muralis — Project RWA Token Program
//!
//! Mints the **Project RWA**: a 1-of-1 Metaplex NFT that represents a physical
//! sustainable urban mural as a Real World Asset on Solana.
//!
//! Unlike the supporter certificate (one per contribution), the Project RWA is:
//!   - One per project (enforced by `ProjectRegistry` PDA seeded by `project_id`)
//!   - Owned by the artist's wallet
//!   - Carries the mural's verifiable impact metadata (area, CO2, location)
//!   - Becomes the canonical on-chain reference for the mural's QR Code
//!
//! Steps performed by `mint_project_rwa`:
//!   1. Create the `ProjectRegistry` PDA (idempotency guarantee — fails if exists).
//!   2. Mint exactly 1 token (decimals=0) into the artist's ATA.
//!   3. Create the Metaplex Metadata account.
//!   4. Create the Master Edition (freezes supply at 1 = true NFT).
//!   5. Emit `ProjectRwaMinted` event for indexers.
//!
//! Network: Devnet for hackathon; Mainnet after audit.

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3,
        mpl_token_metadata::types::{Creator, DataV2},
        CreateMasterEditionV3, CreateMetadataAccountsV3, Metadata,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("4PSmGkkws6ncVo2EA3ksK5itg4q6qDikMuK6CLvZUXwz");

// ─────────────────────────────────────────────────────────────────────────
// Program
// ─────────────────────────────────────────────────────────────────────────

#[program]
pub mod muralis_rwa {
    use super::*;

    /// Mint the unique RWA token representing a sustainable mural.
    ///
    /// Args:
    ///   - `project_id`           Stable identifier (used as PDA seed).
    ///   - `name`                 Metaplex NFT name (≤ 32 chars).
    ///   - `symbol`               Metaplex symbol (≤ 10 chars).
    ///   - `uri`                  Off-chain JSON metadata URI (≤ 200 chars).
    ///   - `area_sq_meters`       Mural area in m².
    ///   - `co2_kg_per_year_x1000` CO₂ absorption in kg/year × 1000 (fixed-point).
    ///   - `target_usdc`          Funding target (in USDC base units, 6 dec).
    pub fn mint_project_rwa(
        ctx: Context<MintProjectRwa>,
        project_id: String,
        name: String,
        symbol: String,
        uri: String,
        area_sq_meters: u64,
        co2_kg_per_year_x1000: u64,
        target_usdc: u64,
    ) -> Result<()> {
        // ─── Validation ──────────────────────────────────────────────────
        require!(
            !project_id.is_empty() && project_id.len() <= 64,
            RwaError::InvalidProjectId
        );
        require!(area_sq_meters > 0, RwaError::InvalidArea);
        require!(target_usdc > 0, RwaError::InvalidTarget);
        require!(name.len() <= 32, RwaError::NameTooLong);
        require!(symbol.len() <= 10, RwaError::SymbolTooLong);
        require!(uri.len() <= 200, RwaError::UriTooLong);

        // ─── 1. Persist the ProjectRegistry (idempotency) ────────────────
        let registry = &mut ctx.accounts.project_registry;
        registry.project_id = project_id.clone();
        registry.artist = ctx.accounts.artist.key();
        registry.mint = ctx.accounts.mint.key();
        registry.area_sq_meters = area_sq_meters;
        registry.co2_kg_per_year_x1000 = co2_kg_per_year_x1000;
        registry.target_usdc = target_usdc;
        registry.created_at = Clock::get()?.unix_timestamp;
        registry.bump = ctx.bumps.project_registry;

        // ─── 2. Mint 1 NFT to the artist's ATA ───────────────────────────
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.artist_token_account.to_account_info(),
            authority: ctx.accounts.artist.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        mint_to(cpi_ctx, 1)?;

        // ─── 3. Create Metaplex metadata ─────────────────────────────────
        let creators = vec![Creator {
            address: ctx.accounts.artist.key(),
            verified: false,
            share: 100,
        }];

        let data = DataV2 {
            name: name.clone(),
            symbol: symbol.clone(),
            uri: uri.clone(),
            seller_fee_basis_points: 0,
            creators: Some(creators),
            collection: None,
            uses: None,
        };

        let cpi_accounts = CreateMetadataAccountsV3 {
            metadata: ctx.accounts.metadata_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_authority: ctx.accounts.artist.to_account_info(),
            update_authority: ctx.accounts.artist.to_account_info(),
            payer: ctx.accounts.artist.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            cpi_accounts,
        );
        create_metadata_accounts_v3(cpi_ctx, data, true, true, None)?;

        // ─── 4. Create Master Edition (freezes supply at 1) ──────────────
        let cpi_accounts = CreateMasterEditionV3 {
            edition: ctx.accounts.master_edition_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            update_authority: ctx.accounts.artist.to_account_info(),
            mint_authority: ctx.accounts.artist.to_account_info(),
            payer: ctx.accounts.artist.to_account_info(),
            metadata: ctx.accounts.metadata_account.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            cpi_accounts,
        );
        create_master_edition_v3(cpi_ctx, Some(0))?;

        // ─── 5. Emit event ───────────────────────────────────────────────
        emit!(ProjectRwaMinted {
            project_id,
            artist: ctx.accounts.artist.key(),
            mint: ctx.accounts.mint.key(),
            area_sq_meters,
            co2_kg_per_year_x1000,
            target_usdc,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Mark the project's mural as completed on-chain.
    /// Called by the artist once the physical mural is finished and the QR
    /// Code is generated. Stamps a `completed_at` timestamp into the registry.
    pub fn mark_completed(ctx: Context<MarkCompleted>) -> Result<()> {
        let registry = &mut ctx.accounts.project_registry;
        require!(
            ctx.accounts.artist.key() == registry.artist,
            RwaError::Unauthorized
        );
        require!(registry.completed_at == 0, RwaError::AlreadyCompleted);

        registry.completed_at = Clock::get()?.unix_timestamp;

        emit!(ProjectCompleted {
            project_id: registry.project_id.clone(),
            artist: registry.artist,
            mint: registry.mint,
            timestamp: registry.completed_at,
        });

        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────

/// One per project — enforces a single RWA mint per project_id.
#[account]
#[derive(InitSpace)]
pub struct ProjectRegistry {
    #[max_len(64)]
    pub project_id: String,
    pub artist: Pubkey,
    pub mint: Pubkey,
    pub area_sq_meters: u64,
    pub co2_kg_per_year_x1000: u64,
    pub target_usdc: u64,
    pub created_at: i64,
    pub completed_at: i64, // 0 = not yet completed
    pub bump: u8,
}

// ─────────────────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(project_id: String)]
pub struct MintProjectRwa<'info> {
    #[account(mut)]
    pub artist: Signer<'info>,

    #[account(
        init,
        payer = artist,
        space = 8 + ProjectRegistry::INIT_SPACE,
        seeds = [b"project", project_id.as_bytes()],
        bump,
    )]
    pub project_registry: Account<'info, ProjectRegistry>,

    #[account(
        init,
        payer = artist,
        mint::decimals = 0,
        mint::authority = artist,
        mint::freeze_authority = artist,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = artist,
        associated_token::mint = mint,
        associated_token::authority = artist,
    )]
    pub artist_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA validated by Metaplex Token Metadata program.
    /// Seeds: [b"metadata", token_metadata_program.key(), mint.key()]
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: PDA validated by Metaplex Token Metadata program.
    /// Seeds: [b"metadata", token_metadata_program.key(), mint.key(), b"edition"]
    #[account(mut)]
    pub master_edition_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MarkCompleted<'info> {
    #[account(mut)]
    pub artist: Signer<'info>,

    #[account(
        mut,
        seeds = [b"project", project_registry.project_id.as_bytes()],
        bump = project_registry.bump,
        has_one = artist @ RwaError::Unauthorized,
    )]
    pub project_registry: Account<'info, ProjectRegistry>,
}

// ─────────────────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────────────────

#[event]
pub struct ProjectRwaMinted {
    pub project_id: String,
    pub artist: Pubkey,
    pub mint: Pubkey,
    pub area_sq_meters: u64,
    pub co2_kg_per_year_x1000: u64,
    pub target_usdc: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProjectCompleted {
    pub project_id: String,
    pub artist: Pubkey,
    pub mint: Pubkey,
    pub timestamp: i64,
}

// ─────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────

#[error_code]
pub enum RwaError {
    #[msg("Project ID must be between 1 and 64 characters.")]
    InvalidProjectId,
    #[msg("Area must be greater than zero.")]
    InvalidArea,
    #[msg("Target USDC must be greater than zero.")]
    InvalidTarget,
    #[msg("Name exceeds Metaplex limit (32 characters).")]
    NameTooLong,
    #[msg("Symbol exceeds Metaplex limit (10 characters).")]
    SymbolTooLong,
    #[msg("URI exceeds Metaplex limit (200 characters).")]
    UriTooLong,
    #[msg("Project is already marked as completed.")]
    AlreadyCompleted,
    #[msg("Unauthorized signer.")]
    Unauthorized,
}
