/**
 * Muralis NFT — Anchor integration tests
 *
 * Run with: `anchor test` (uses local validator) or `anchor test --skip-local-validator`
 * if you want to point at Devnet (slower but more realistic).
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MuralisNft } from "../target/types/muralis_nft";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { expect } from "chai";

// Metaplex Token Metadata program ID (constant across all clusters)
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("muralis_nft", () => {
  // Provider configured via Anchor.toml ([provider] section)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MuralisNft as Program<MuralisNft>;
  const payer = provider.wallet as anchor.Wallet;

  it("Mints a supporter certificate NFT", async () => {
    // ─── Setup: airdrop if balance is low (works on localnet/devnet) ─────
    const balance = await provider.connection.getBalance(payer.publicKey);
    if (balance < 1 * LAMPORTS_PER_SOL) {
      const sig = await provider.connection.requestAirdrop(
        payer.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig, "confirmed");
    }

    // ─── Generate the mint keypair for this NFT ──────────────────────────
    const mint = Keypair.generate();

    // ─── Derive PDAs for Metaplex metadata + master edition ──────────────
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [masterEditionAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const supporterTokenAccount = getAssociatedTokenAddressSync(
      mint.publicKey,
      payer.publicKey
    );

    // ─── Instruction args (mirror the real frontend call) ───────────────
    const projectId = "jardim-das-americas-001";
    const contributionAmount = new anchor.BN(50_000_000); // 50 USDC (6 decimals)
    const name = "Muralis Supporter #001";
    const symbol = "MURSUP";
    const uri = "https://arweave.net/example-supporter-cert-metadata";

    // ─── Call the program ────────────────────────────────────────────────
    const tx = await program.methods
      .mintSupporterCertificate(projectId, contributionAmount, name, symbol, uri)
      .accounts({
        payer: payer.publicKey,
        mint: mint.publicKey,
        supporterTokenAccount,
        metadataAccount,
        masterEditionAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([mint])
      .rpc({ commitment: "confirmed" });

    console.log("✅ Tx signature:", tx);
    console.log("✅ Mint:", mint.publicKey.toBase58());
    console.log("✅ Metadata:", metadataAccount.toBase58());

    // ─── Assertions ──────────────────────────────────────────────────────
    const tokenAccountInfo = await provider.connection.getTokenAccountBalance(
      supporterTokenAccount
    );
    expect(tokenAccountInfo.value.uiAmount).to.equal(1);
  });

  it("Rejects zero contribution", async () => {
    const mint = Keypair.generate();
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const supporterTokenAccount = getAssociatedTokenAddressSync(
      mint.publicKey,
      payer.publicKey
    );

    try {
      await program.methods
        .mintSupporterCertificate("p1", new anchor.BN(0), "X", "X", "https://x")
        .accounts({
          payer: payer.publicKey,
          mint: mint.publicKey,
          supporterTokenAccount,
          metadataAccount,
          masterEditionAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([mint])
        .rpc();
      expect.fail("Should have thrown ZeroContribution");
    } catch (err: any) {
      expect(err.toString()).to.include("ZeroContribution");
    }
  });
});
