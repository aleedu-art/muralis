//! Muralis — Supporter Certificate NFT Program
//!
//! This Anchor program mints a Metaplex-compatible NFT that serves as a
//! "Certificate of Contribution" for supporters who finance a sustainable
//! urban mural project on the Muralis platform.
//!
//! The certificate stores:
//!   - The project ID being financed
//!   - The contribution amount (in USDC base units, 1 USDC = 1_000_000)
//!   - The supporter's wallet
//!   - An on-chain timestamp
//!
//! Rich metadata (image, attributes, description) lives off-chain at the
//! URI provided at mint-time (Arweave / IPFS).
//!
//! Network: Devnet (for hackathon demo); Mainnet after audit.

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

declare_id!("BAwh4QcGuNCgYVVfo6pZ8LndAi5WgqU6FHdCo8Y1fAN8");

#[program]
pub mod muralis_nft {
    use super::*;

    /// Mint a single Supporter Certificate NFT to the signer.
    ///
    /// Steps performed:
    ///   1. Mint exactly 1 token (decimals=0) into the supporter's ATA.
    ///   2. Create the Metaplex Metadata account with the provided URI.
    ///   3. Create the Master Edition account, freezing supply at 1 (true NFT).
    ///   4. Emit a `SupporterCertificateMinted` event for off-chain indexing.
    ///
    /// Validation:
    ///   - `project_id` must be 1..=64 chars.
    ///   - `contribution_amount` must be > 0.
    ///   - `name`, `symbol`, `uri` enforce Metaplex max lengths.
    pub fn mint_supporter_certificate(
        ctx: Context<MintSupporterCertificate>,
        project_id: String,
        contribution_amount: u64,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        // ─── Input validation ────────────────────────────────────────────
        require!(
            !project_id.is_empty() && project_id.len() <= 64,
            MuralisError::InvalidProjectId
        );
        require!(contribution_amount > 0, MuralisError::ZeroContribution);
        require!(name.len() <= 32, MuralisError::NameTooLong);
        require!(symbol.len() <= 10, MuralisError::SymbolTooLong);
        require!(uri.len() <= 200, MuralisError::UriTooLong);

        // ─── 1. Mint 1 token to the supporter's ATA ──────────────────────
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.supporter_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        mint_to(cpi_ctx, 1)?;

        // ─── 2. Create Metaplex metadata ─────────────────────────────────
        let creator = vec![Creator {
            address: ctx.accounts.payer.key(),
            verified: false,
            share: 100,
        }];

        let data = DataV2 {
            name: name.clone(),
            symbol: symbol.clone(),
            uri: uri.clone(),
            seller_fee_basis_points: 0, // certificate NFTs are not for resale royalty
            creators: Some(creator),
            collection: None,
            uses: None,
        };

        let cpi_accounts = CreateMetadataAccountsV3 {
            metadata: ctx.accounts.metadata_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_authority: ctx.accounts.payer.to_account_info(),
            update_authority: ctx.accounts.payer.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            cpi_accounts,
        );
        create_metadata_accounts_v3(cpi_ctx, data, true, true, None)?;

        // ─── 3. Create Master Edition (freezes supply at 1 = NFT) ────────
        let cpi_accounts = CreateMasterEditionV3 {
            edition: ctx.accounts.master_edition_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            update_authority: ctx.accounts.payer.to_account_info(),
            mint_authority: ctx.accounts.payer.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            metadata: ctx.accounts.metadata_account.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            cpi_accounts,
        );
        create_master_edition_v3(cpi_ctx, Some(0))?; // max_supply=0 means no prints

        // ─── 4. Emit event for off-chain indexers ────────────────────────
        emit!(SupporterCertificateMinted {
            supporter: ctx.accounts.payer.key(),
            mint: ctx.accounts.mint.key(),
            project_id,
            contribution_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct MintSupporterCertificate<'info> {
    /// The supporter — pays for mint and receives the NFT.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// New mint account for this single NFT (decimals = 0).
    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = payer,
        mint::freeze_authority = payer,
    )]
    pub mint: Account<'info, Mint>,

    /// Associated token account that will hold the NFT.
    #[account(
        init,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub supporter_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA validated and written by the Metaplex Token Metadata program.
    /// Seeds: [b"metadata", token_metadata_program.key(), mint.key()]
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: PDA validated and written by the Metaplex Token Metadata program.
    /// Seeds: [b"metadata", token_metadata_program.key(), mint.key(), b"edition"]
    #[account(mut)]
    pub master_edition_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// ─────────────────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────────────────

#[event]
pub struct SupporterCertificateMinted {
    pub supporter: Pubkey,
    pub mint: Pubkey,
    pub project_id: String,
    pub contribution_amount: u64,
    pub timestamp: i64,
}

// ─────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────

#[error_code]
pub enum MuralisError {
    #[msg("Project ID must be between 1 and 64 characters.")]
    InvalidProjectId,
    #[msg("Contribution amount must be greater than zero.")]
    ZeroContribution,
    #[msg("Name exceeds Metaplex limit (32 characters).")]
    NameTooLong,
    #[msg("Symbol exceeds Metaplex limit (10 characters).")]
    SymbolTooLong,
    #[msg("URI exceeds Metaplex limit (200 characters).")]
    UriTooLong,
}
