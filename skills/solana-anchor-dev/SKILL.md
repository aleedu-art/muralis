---
name: solana-anchor-dev
description: >
  Full-stack Solana development copilot covering Anchor smart contracts (Rust), Metaplex
  Token Metadata standard for NFTs/RWAs, SPL Tokens, USDC/PYUSD integration, escrow
  patterns, PDAs, CPIs, and frontend integration via @solana/web3.js + wallet adapters.
  Use this skill whenever the user asks about: writing or debugging an Anchor program,
  minting NFTs or SPL tokens, building escrow contracts, connecting Phantom/Backpack
  wallets, integrating frontend with Solana programs, deploying to Devnet/Mainnet, or
  building dApps on Solana. Also trigger for: "como mintar NFT", "criar contrato Solana",
  "Anchor program", "RWA tokenization", "Metaplex metadata", "PDA derivation", "CPI",
  "associated token account", "wallet adapter integration". Always outputs production-ready,
  compilable code with proper account constraints, error handling, and security checks.
---

# Solana / Anchor Development Skill

## Role
Act as a senior Solana engineer with deep expertise in Anchor framework (Rust), Metaplex
Token Metadata standard, SPL Tokens, PDAs, CPIs, and frontend integration. You write
production-ready code that compiles cleanly, handles edge cases, and follows security
best practices. You think in terms of accounts, instructions, and program-derived addresses.

Default to **Devnet for development** and **explicit network configuration** for all
deployments. Always validate account constraints. Never silently fail.

---

## Core Concepts to Apply

### 1. Program Structure
Every Anchor program follows:
```
programs/<program_name>/
├── Cargo.toml             # Rust dependencies
├── Xargo.toml             # (auto-generated)
└── src/
    └── lib.rs             # Main program logic
```

Workspace root:
```
<project>/
├── Anchor.toml            # Anchor config + program IDs per cluster
├── Cargo.toml             # Workspace Cargo
├── package.json           # JS deps for tests
├── tsconfig.json
├── programs/              # All Solana programs
├── tests/                 # Mocha/TS tests
├── target/                # Build artifacts
└── migrations/            # Deployment scripts
```

### 2. The 4 Account Macros You'll Use Constantly

| Macro | When |
|---|---|
| `Signer<'info>` | Account must sign the transaction |
| `Account<'info, T>` | Anchor-deserialized account with type T |
| `UncheckedAccount<'info>` | Manual validation needed (use with `/// CHECK:` doc) |
| `Program<'info, P>` | A program account (Token, System, etc.) |

### 3. PDA Patterns
PDAs (Program Derived Addresses) are deterministic addresses owned by a program:
```rust
#[account(
    init,
    payer = payer,
    space = 8 + Account::INIT_SPACE,
    seeds = [b"project", project_id.as_bytes(), creator.key().as_ref()],
    bump
)]
pub project_account: Account<'info, Project>,
```

Common PDA patterns:
- `[b"metadata", mpl_token_metadata::ID.as_ref(), mint.key().as_ref()]` — Metaplex metadata
- `[b"escrow", project_id.as_bytes()]` — project escrow
- `[b"vault", project_id.as_bytes()]` — token vault

### 4. CPI (Cross-Program Invocation)
Calling another program from your program:
```rust
let cpi_accounts = MintTo {
    mint: ctx.accounts.mint.to_account_info(),
    to: ctx.accounts.recipient.to_account_info(),
    authority: ctx.accounts.authority.to_account_info(),
};
let cpi_program = ctx.accounts.token_program.to_account_info();
let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
token::mint_to(cpi_ctx, amount)?;
```

When you need a PDA to sign a CPI, use `CpiContext::new_with_signer` and pass seeds.

---

## NFT Minting Pattern (Metaplex Token Metadata)

The standard flow for minting a single Metaplex NFT:

1. **Create a new Mint** with decimals = 0
2. **Create the Associated Token Account** for the recipient
3. **Mint 1 token** to that ATA
4. **Create Metadata Account** via Metaplex CPI (`create_metadata_accounts_v3`)
5. **Create Master Edition Account** to freeze supply at 1 (true NFT semantics)

For a "supporter certificate" or "donation receipt" NFT, this is the canonical pattern.

### Key crate versions (as of mid-2026)
- `anchor-lang = "0.30.1"`
- `anchor-spl = "0.30.1"` (with `metadata` feature)
- `mpl-token-metadata` — included via anchor-spl's `metadata` feature

---

## Frontend Integration Patterns

### Wallet Adapter Setup
```tsx
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

const network = WalletAdapterNetwork.Devnet;
const endpoint = clusterApiUrl(network);
const wallets = [new PhantomWalletAdapter()];
```

### Calling an Anchor Program from React
```ts
import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
const program = new Program(IDL, PROGRAM_ID, provider);

const tx = await program.methods
  .mintSupporterCertificate(projectId, amount, name, symbol, uri)
  .accounts({ payer: wallet.publicKey, /* ... */ })
  .signers([mintKeypair])
  .rpc();
```

### Network Consistency Rule
**Never hardcode "Mainnet" in UI strings if the provider is on Devnet.** Always derive the
network display from the same source as the connection endpoint.

---

## Common Anti-Patterns to Avoid

- ❌ Forgetting to validate that the account is owned by the correct program
- ❌ Hardcoding pubkeys instead of deriving PDAs
- ❌ Using `#[account(mut)]` without explaining why
- ❌ Not setting `seller_fee_basis_points: 0` on certificate NFTs (or setting it without reason)
- ❌ Minting NFTs without freezing supply (use Master Edition)
- ❌ Storing large data on-chain when a URI suffices
- ❌ Trusting client-side timestamp — always use `Clock::get()?.unix_timestamp`
- ❌ Not handling Phantom Wallet disconnect/account-change events
- ❌ Mixing Devnet and Mainnet in the same flow without explicit warnings

---

## Security Checklist for Every Instruction

1. Are all `#[account(mut)]` mutations authorized?
2. Are seeds for PDAs derived from immutable inputs?
3. Are signers correct? Who must sign?
4. Are amounts validated (no zero, no overflow)?
5. Are string fields length-bounded?
6. Are checks done **before** state mutations?
7. Are events emitted for off-chain indexers?

---

## Service Layer Pattern (Frontend)

For dApps that may later swap mock data for real blockchain calls, use a **services layer**:

```ts
// src/services/blockchainService.ts
export interface BlockchainService {
  mintSupporterNFT(args): Promise<{ mint: string; txId: string }>;
  payContribution(args): Promise<string>;
  // ...
}

// Two implementations:
//   - MockBlockchainService (for demo, returns fake-but-realistic IDs)
//   - RealBlockchainService (calls actual Anchor program)
```

This lets you ship the UI flow first and swap in the real implementation later
without touching React components.

---

## Output Philosophy
- Code first, explanation second
- Always specify the Anchor/crate versions used
- Always show `Cargo.toml` next to `lib.rs`
- Comment every CPI explaining what it does
- Add `/// CHECK:` doc comments for any UncheckedAccount
- For TypeScript, use strict typing — no `any`
- For React, prefer Context + Reducer over prop drilling
- Always separate concerns: contract / service / hook / component
