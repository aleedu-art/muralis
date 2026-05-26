import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  Keypair,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { expect } from "chai";

const LOCALNET_URL = "http://127.0.0.1:8899";
const PROGRAM_ID = new PublicKey("4PSmGkkws6ncVo2EA3ksK5itg4q6qDikMuK6CLvZUXwz");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("smoke_rwa — localnet", () => {
  const connection = new Connection(LOCALNET_URL, "confirmed");

  const walletBytes = JSON.parse(
    readFileSync(`${homedir()}/.config/solana/id.json`, "utf-8")
  );
  const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(walletBytes));
  const wallet = new anchor.Wallet(walletKeypair);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idl = JSON.parse(
    readFileSync(join(process.cwd(), "target/idl/muralis_rwa.json"), "utf-8")
  );
  const program = new anchor.Program(idl, provider);

  it("mint_project_rwa registra o projeto com sucesso", async () => {
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < LAMPORTS_PER_SOL) {
      const sig = await connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(sig, "confirmed");
    }

    const mint = Keypair.generate();
    const projectId = `rwa-smoke-${Date.now()}`;

    const [projectRegistry] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectId)],
      PROGRAM_ID
    );

    const artistTokenAccount = getAssociatedTokenAddressSync(
      mint.publicKey,
      wallet.publicKey
    );

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

    const tx = await program.methods
      .mintProjectRwa(
        projectId,
        "Muralis RWA #001",
        "MURRWA",
        "https://arweave.net/example-rwa-metadata",
        new BN(120),
        new BN(2400),
        new BN(500_000_000)
      )
      .accounts({
        artist: wallet.publicKey,
        projectRegistry,
        mint: mint.publicKey,
        artistTokenAccount,
        metadataAccount,
        masterEditionAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([mint])
      .rpc({ commitment: "confirmed" });

    console.log("  tx:", tx);
    console.log("  projectRegistry:", projectRegistry.toBase58());
    console.log("  mint:", mint.publicKey.toBase58());

    const tokenBalance = await connection.getTokenAccountBalance(
      artistTokenAccount
    );
    expect(tokenBalance.value.uiAmount).to.equal(1);
  });
});
