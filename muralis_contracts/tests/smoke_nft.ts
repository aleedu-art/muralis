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
const PROGRAM_ID = new PublicKey("BAwh4QcGuNCgYVVfo6pZ8LndAi5WgqU6FHdCo8Y1fAN8");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("smoke_nft — localnet", () => {
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
    readFileSync(join(process.cwd(), "target/idl/muralis_nft.json"), "utf-8")
  );
  const program = new anchor.Program(idl, provider);

  it("mint_supporter_certificate executa com sucesso", async () => {
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < LAMPORTS_PER_SOL) {
      const sig = await connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(sig, "confirmed");
    }

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
      wallet.publicKey
    );

    const tx = await program.methods
      .mintSupporterCertificate(
        "jardim-das-americas-001",
        new BN(50_000_000),
        "Muralis Supporter #001",
        "MURSUP",
        "https://arweave.net/example-supporter-cert-metadata"
      )
      .accounts({
        payer: wallet.publicKey,
        mint: mint.publicKey,
        supporterTokenAccount,
        metadataAccount,
        masterEditionAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([mint])
      .rpc({ commitment: "confirmed" });

    console.log("  tx:", tx);
    console.log("  mint:", mint.publicKey.toBase58());

    const tokenBalance = await connection.getTokenAccountBalance(
      supporterTokenAccount
    );
    expect(tokenBalance.value.uiAmount).to.equal(1);
  });
});
