/**
 * Muralis RWA — Anchor integration tests
 *
 * Verifies that an artist can mint a project RWA NFT and then mark it as completed.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MuralisRwa } from "../target/types/muralis_rwa";
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

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("muralis_rwa", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MuralisRwa as Program<MuralisRwa>;
  const artist = provider.wallet as anchor.Wallet;

  const projectId = `test-mural-${Date.now()}`;

  let mint: Keypair;
  let projectRegistryPda: PublicKey;

  before(async () => {
    const balance = await provider.connection.getBalance(artist.publicKey);
    if (balance < 1 * LAMPORTS_PER_SOL) {
      const sig = await provider.connection.requestAirdrop(
        artist.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig, "confirmed");
    }
  });

  it("Mints a project RWA NFT", async () => {
    mint = Keypair.generate();

    [projectRegistryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectId)],
      program.programId
    );

    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.publicKey.toBuffer()],
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

    const artistTokenAccount = getAssociatedTokenAddressSync(
      mint.publicKey,
      artist.publicKey
    );

    const tx = await program.methods
      .mintProjectRwa(
        projectId,
        "Muralis Project Test",
        "MURPROJ",
        "https://arweave.net/test-project-metadata",
        new anchor.BN(120), // 120 m²
        new anchor.BN(2400), // 2.4 kg CO2/year * 1000
        new anchor.BN(500_000_000) // 500 USDC (6 decimals)
      )
      .accounts({
        artist: artist.publicKey,
        projectRegistry: projectRegistryPda,
        mint: mint.publicKey,
        artistTokenAccount,
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

    console.log("✅ Tx:", tx);
    console.log("✅ Mint:", mint.publicKey.toBase58());
    console.log("✅ Registry PDA:", projectRegistryPda.toBase58());

    const balance = await provider.connection.getTokenAccountBalance(artistTokenAccount);
    expect(balance.value.uiAmount).to.equal(1);

    const registry = await program.account.projectRegistry.fetch(projectRegistryPda);
    expect(registry.projectId).to.equal(projectId);
    expect(registry.artist.toBase58()).to.equal(artist.publicKey.toBase58());
    expect(registry.areaSqMeters.toNumber()).to.equal(120);
    expect(registry.completedAt.toNumber()).to.equal(0);
  });

  it("Marks the project as completed", async () => {
    const tx = await program.methods
      .markCompleted()
      .accounts({
        artist: artist.publicKey,
        projectRegistry: projectRegistryPda,
      })
      .rpc({ commitment: "confirmed" });

    console.log("✅ Complete tx:", tx);

    const registry = await program.account.projectRegistry.fetch(projectRegistryPda);
    expect(registry.completedAt.toNumber()).to.be.greaterThan(0);
  });

  it("Refuses to mint a second RWA for the same project_id", async () => {
    const secondMint = Keypair.generate();
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), secondMint.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        secondMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const artistTokenAccount = getAssociatedTokenAddressSync(secondMint.publicKey, artist.publicKey);

    try {
      await program.methods
        .mintProjectRwa(
          projectId, // same project_id → should fail
          "X",
          "X",
          "https://x",
          new anchor.BN(1),
          new anchor.BN(0),
          new anchor.BN(1)
        )
        .accounts({
          artist: artist.publicKey,
          projectRegistry: projectRegistryPda,
          mint: secondMint.publicKey,
          artistTokenAccount,
          metadataAccount,
          masterEditionAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([secondMint])
        .rpc();
      expect.fail("Should have rejected duplicate project_id");
    } catch (err: any) {
      // PDA already initialized — Anchor throws "already in use"
      expect(err.toString().toLowerCase()).to.match(/already in use|account.*exists/);
    }
  });
});
