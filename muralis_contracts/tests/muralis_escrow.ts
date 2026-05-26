/**
 * Muralis Escrow — Anchor integration tests
 *
 * Setup:
 *   - Creates a mock "USDC" SPL mint on the test cluster (6 decimals).
 *   - Funds an artist and 2 contributors.
 *   - Runs init → contribute (multiple) → release.
 *
 * Run with `anchor test` on local validator.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MuralisEscrow } from "../target/types/muralis_escrow";
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
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("muralis_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MuralisEscrow as Program<MuralisEscrow>;

  const artist = Keypair.generate();
  const contributorA = Keypair.generate();
  const contributorB = Keypair.generate();

  let usdcMint: PublicKey;
  let artistUsdcAta: PublicKey;
  let contribAUsdcAta: PublicKey;
  let contribBUsdcAta: PublicKey;

  const projectId = `test-escrow-${Date.now()}`;
  let escrowPda: PublicKey;
  let vaultPda: PublicKey;

  before(async () => {
    // Airdrop SOL to test accounts
    for (const kp of [artist, contributorA, contributorB]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig, "confirmed");
    }

    // Create mock USDC mint (6 decimals)
    const payer = (provider.wallet as anchor.Wallet).payer;
    usdcMint = await createMint(provider.connection, payer, payer.publicKey, null, 6);

    // ATAs for everyone
    artistUsdcAta = (
      await getOrCreateAssociatedTokenAccount(provider.connection, payer, usdcMint, artist.publicKey)
    ).address;
    contribAUsdcAta = (
      await getOrCreateAssociatedTokenAccount(provider.connection, payer, usdcMint, contributorA.publicKey)
    ).address;
    contribBUsdcAta = (
      await getOrCreateAssociatedTokenAccount(provider.connection, payer, usdcMint, contributorB.publicKey)
    ).address;

    // Mint USDC to contributors (1000 USDC each)
    await mintTo(provider.connection, payer, usdcMint, contribAUsdcAta, payer, 1_000_000_000);
    await mintTo(provider.connection, payer, usdcMint, contribBUsdcAta, payer, 1_000_000_000);

    [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), Buffer.from(projectId)],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(projectId)],
      program.programId
    );
  });

  it("Initializes the escrow", async () => {
    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 60 * 60 * 24 * 30; // 30 days

    const tx = await program.methods
      .initializeEscrow(projectId, new anchor.BN(500_000_000), new anchor.BN(deadline)) // 500 USDC target
      .accounts({
        artist: artist.publicKey,
        escrowState: escrowPda,
        vault: vaultPda,
        paymentMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([artist])
      .rpc({ commitment: "confirmed" });

    console.log("✅ Init tx:", tx);

    const state = await program.account.escrowState.fetch(escrowPda);
    expect(state.projectId).to.equal(projectId);
    expect(state.targetAmount.toNumber()).to.equal(500_000_000);
    expect(state.raisedAmount.toNumber()).to.equal(0);
  });

  it("Accepts a contribution from contributor A", async () => {
    const tx = await program.methods
      .contribute(new anchor.BN(200_000_000)) // 200 USDC
      .accounts({
        contributor: contributorA.publicKey,
        escrowState: escrowPda,
        vault: vaultPda,
        contributorTokenAccount: contribAUsdcAta,
        paymentMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([contributorA])
      .rpc({ commitment: "confirmed" });

    console.log("✅ Contribute A tx:", tx);

    const state = await program.account.escrowState.fetch(escrowPda);
    expect(state.raisedAmount.toNumber()).to.equal(200_000_000);

    const vault = await getAccount(provider.connection, vaultPda);
    expect(Number(vault.amount)).to.equal(200_000_000);
  });

  it("Accepts a contribution from contributor B and flips status to Funded", async () => {
    await program.methods
      .contribute(new anchor.BN(350_000_000)) // 350 USDC → total 550, exceeds 500 target
      .accounts({
        contributor: contributorB.publicKey,
        escrowState: escrowPda,
        vault: vaultPda,
        contributorTokenAccount: contribBUsdcAta,
        paymentMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([contributorB])
      .rpc({ commitment: "confirmed" });

    const state = await program.account.escrowState.fetch(escrowPda);
    expect(state.raisedAmount.toNumber()).to.equal(550_000_000);
    // status enum serialized: { funded: {} }
    expect(state.status).to.have.property("funded");
  });

  it("Releases funds to the artist", async () => {
    const before = await getAccount(provider.connection, artistUsdcAta);

    const tx = await program.methods
      .release()
      .accounts({
        artist: artist.publicKey,
        escrowState: escrowPda,
        vault: vaultPda,
        artistTokenAccount: artistUsdcAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([artist])
      .rpc({ commitment: "confirmed" });

    console.log("✅ Release tx:", tx);

    const after = await getAccount(provider.connection, artistUsdcAta);
    expect(Number(after.amount) - Number(before.amount)).to.equal(550_000_000);

    const vault = await getAccount(provider.connection, vaultPda);
    expect(Number(vault.amount)).to.equal(0);

    const state = await program.account.escrowState.fetch(escrowPda);
    expect(state.status).to.have.property("released");
  });
});
