import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  Keypair,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint } from "@solana/spl-token";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { expect } from "chai";

const LOCALNET_URL = "http://127.0.0.1:8899";
const PROGRAM_ID = new PublicKey("2fqfbWq6ZQkonqiN6UnpXKXdvr4HzLqSXi3XE5UrBLfR");

describe("smoke_escrow — localnet", () => {
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
    readFileSync(join(process.cwd(), "target/idl/muralis_escrow.json"), "utf-8")
  );
  const program = new anchor.Program(idl, provider);

  it("initialize_escrow cria a arrecadação com sucesso", async () => {
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < LAMPORTS_PER_SOL) {
      const sig = await connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(sig, "confirmed");
    }

    const paymentMint = await createMint(
      connection,
      walletKeypair,
      wallet.publicKey,
      null,
      6
    );

    const projectId = `escrow-smoke-${Date.now()}`;
    const targetAmount = new BN(500_000_000); // 500 USDC
    const deadline = new BN(Math.floor(Date.now() / 1000) + 86400 * 30);

    const [escrowState] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), Buffer.from(projectId)],
      PROGRAM_ID
    );
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(projectId)],
      PROGRAM_ID
    );

    const tx = await program.methods
      .initializeEscrow(projectId, targetAmount, deadline)
      .accounts({
        artist: wallet.publicKey,
        escrowState,
        vault,
        paymentMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc({ commitment: "confirmed" });

    console.log("  tx:", tx);
    console.log("  escrowState:", escrowState.toBase58());

    const accountInfo = await connection.getAccountInfo(escrowState);
    expect(accountInfo).to.not.be.null;
    expect(accountInfo!.lamports).to.be.greaterThan(0);
  });
});
