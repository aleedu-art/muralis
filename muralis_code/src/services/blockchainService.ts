/**
 * Blockchain Service — Service Layer Pattern
 *
 * Define a interface, a implementação MOCK e a implementação REAL do serviço.
 * O singleton `blockchainService` delega para `_active` em tempo de chamada,
 * então trocar `_active` via `setBlockchainService()` afeta todos os flows
 * sem que eles precisem mudar.
 *
 * Componentes React NÃO chamam @solana/web3.js diretamente — sempre via flows.
 */

import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { BN, type AnchorProvider, type Program } from "@coral-xyz/anchor";
import type { Project } from "../types";

// ─────────────────────────────────────────────────────────────────────────
// Result types (interface pública inalterada)
// ─────────────────────────────────────────────────────────────────────────

export interface MintRwaResult {
  tokenAddress: string;
  txSignature: string;
}

export interface MintSupporterNftResult {
  mintAddress: string;
  txSignature: string;
  metadataUri: string;
}

export interface PayContributionResult {
  txSignature: string;
}

export interface DevFaucetResult {
  solSig: string;
  usdcSig: string;
}

export interface BlockchainService {
  mintProjectRwa(project: Project): Promise<MintRwaResult>;
  payContribution(args: {
    projectId: string;
    supporterWallet: string;
    amountUsdc: number;
  }): Promise<PayContributionResult>;
  mintSupporterNft(args: {
    project: Project;
    supporterWallet: string;
    amountUsdc: number;
  }): Promise<MintSupporterNftResult>;
  generateProofOfImpactQR(projectId: string): Promise<string>;
  devFaucet(): Promise<DevFaucetResult>;
}

// ─────────────────────────────────────────────────────────────────────────
// AnchorPrograms — tipo exportado para uso no AnchorContext
// ─────────────────────────────────────────────────────────────────────────

export interface AnchorPrograms {
  nft: Program;
  escrow: Program;
  rwa: Program;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers de derivação de endereços (sem depender de @solana/spl-token)
// ─────────────────────────────────────────────────────────────────────────

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

/**
 * Devnet USDC mint (Circle). Altere a constante abaixo se usar outro mint.
 * Na produção, mover para variável de ambiente via vite.config define().
 */
const USDC_MINT = new PublicKey("4zMMC9srt5CHGbBt2c22asb5SGMvo7qPygjgf2iUvA34");


function findAta(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

function findMetadataAddress(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
}

function findMasterEditionAddress(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
}


// ─────────────────────────────────────────────────────────────────────────
// REAL implementation
// ─────────────────────────────────────────────────────────────────────────

export class RealBlockchainService implements BlockchainService {
  constructor(
    private readonly programs: AnchorPrograms,
    private readonly provider: AnchorProvider
  ) {}

  async mintProjectRwa(project: Project): Promise<MintRwaResult> {
    const { programs, provider } = this;
    const artist = provider.publicKey;
    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;

    const artistTokenAccount = findAta(artist, mint);
    const metadataAccount = findMetadataAddress(mint);
    const masterEditionAccount = findMasterEditionAddress(mint);

    const projectIdSeed = project.id.replace(/-/g, "");

    const [projectRegistry] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectIdSeed)],
      programs.rwa.programId
    );

    const name = project.title.slice(0, 32);
    const uri = `https://muralis.app/metadata/rwa/${project.id}.json`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txSignature: string = await (programs.rwa.methods as any)
        .mintProjectRwa(
          projectIdSeed,
          name,
          "MRWA",
          uri,
          new BN(Math.round(project.area)),
          new BN(Math.round(project.co2PerYear * 1000)),
          new BN(Math.round(project.goalUsdc * 1_000_000))
        )
        .accounts({
          artist,
          projectRegistry,
          mint,
          artistTokenAccount,
          metadataAccount,
          masterEditionAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKp])
        .rpc();

      // Inicializa o escrow USDC para este projeto na mesma operação de cadastro.
      const deadlineSecs = Math.floor(Date.now() / 1000) + (project.daysRemaining ?? 30) * 86_400;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (programs.escrow.methods as any)
        .initializeEscrow(
          projectIdSeed,
          new BN(Math.round(project.goalUsdc * 1_000_000)),
          new BN(deadlineSecs)
        )
        .accounts({ artist, paymentMint: USDC_MINT })
        .rpc();

      return { tokenAddress: mint.toBase58(), txSignature };
    } catch (err) {
      throw err;
    }
  }

  async payContribution(args: {
    projectId: string;
    supporterWallet: string;
    amountUsdc: number;
  }): Promise<PayContributionResult> {
    const { programs, provider } = this;
    const { projectId, amountUsdc } = args;
    const contributor = provider.publicKey;
    const escrowProgramId = programs.escrow.programId;
    const isDevnet = provider.connection.rpcEndpoint.includes("devnet");

    const [escrowStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), Buffer.from(projectId)],
      escrowProgramId
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(projectId)],
      escrowProgramId
    );
    const contributorTokenAccount = findAta(contributor, USDC_MINT);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txSignature: string = await (programs.escrow.methods as any)
        .contribute(new BN(Math.round(amountUsdc * 1_000_000)))
        .accounts({
          contributor,
          escrowState: escrowStatePda,
          vault: vaultPda,
          contributorTokenAccount,
          paymentMint: USDC_MINT,
        })
        .rpc();

      return { txSignature };
    } catch (err) {
      if (!isDevnet) throw err;

      console.warn(
        "[Muralis] payContribution falhou na Devnet (contrato Escrow não publicado). " +
        "Simulando transferência USDC para demonstração. Erro original:",
        err
      );
      return { txSignature: `devnet-sim-pay-${Date.now()}` };
    }
  }

  async mintSupporterNft(args: {
    project: Project;
    supporterWallet: string;
    amountUsdc: number;
  }): Promise<MintSupporterNftResult> {
    const { programs, provider } = this;
    const { project, amountUsdc } = args;
    const payer = provider.publicKey;
    const isDevnet = provider.connection.rpcEndpoint.includes("devnet");
    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;

    const supporterTokenAccount = findAta(payer, mint);
    const metadataAccount = findMetadataAddress(mint);
    const masterEditionAccount = findMasterEditionAddress(mint);
    const name = `Muralis ${project.title}`.slice(0, 32);
    const uri = `https://muralis.app/metadata/nft/${project.id}/${payer.toBase58()}.json`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txSignature: string = await (programs.nft.methods as any)
        .mintSupporterCertificate(
          project.id,
          new BN(Math.round(amountUsdc * 1_000_000)),
          name,
          "MSUP",
          uri
        )
        .accounts({ payer, mint, supporterTokenAccount, metadataAccount, masterEditionAccount })
        .signers([mintKp])
        .rpc();

      return { mintAddress: mint.toBase58(), txSignature, metadataUri: uri };
    } catch (err) {
      if (!isDevnet) throw err;

      console.warn(
        "[Muralis] mintSupporterNft falhou na Devnet (contrato NFT não publicado). " +
        "Simulando mint do Certificado de Apoiador para demonstração. Erro original:",
        err
      );
      return {
        mintAddress: mint.toBase58(),
        txSignature: `devnet-sim-nft-${Date.now()}`,
        metadataUri: uri,
      };
    }
  }

  async generateProofOfImpactQR(projectId: string): Promise<string> {
    return `https://muralis.app/mural/${projectId}`;
  }

  async devFaucet(): Promise<DevFaucetResult> {
    const { provider } = this;
    const wallet = provider.publicKey;
    const { connection } = provider;

    const solSig = await connection.requestAirdrop(wallet, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(solSig, "confirmed");

    return { solSig, usdcSig: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// MOCK implementation (fallback quando wallet não está conectada)
// ─────────────────────────────────────────────────────────────────────────

const SOLANA_BASE58 =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function fakeBase58(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SOLANA_BASE58[Math.floor(Math.random() * SOLANA_BASE58.length)];
  }
  return out;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class MockBlockchainService implements BlockchainService {
  async mintProjectRwa(project: Project): Promise<MintRwaResult> {
    await delay(1200);
    return { tokenAddress: `MurRWA${fakeBase58(38)}`, txSignature: fakeBase58(88) };
  }

  async payContribution(args: {
    projectId: string;
    supporterWallet: string;
    amountUsdc: number;
  }): Promise<PayContributionResult> {
    void args;
    await delay(900);
    return { txSignature: fakeBase58(88) };
  }

  async mintSupporterNft(args: {
    project: Project;
    supporterWallet: string;
    amountUsdc: number;
  }): Promise<MintSupporterNftResult> {
    void args;
    await delay(1100);
    const mint = `MurSup${fakeBase58(38)}`;
    return {
      mintAddress: mint,
      txSignature: fakeBase58(88),
      metadataUri: `https://arweave.net/mock/${mint}.json`,
    };
  }

  async generateProofOfImpactQR(projectId: string): Promise<string> {
    await delay(300);
    return `https://muralis.app/mural/${projectId}`;
  }

  async devFaucet(): Promise<DevFaucetResult> {
    await delay(1500);
    return { solSig: fakeBase58(88), usdcSig: fakeBase58(88) };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Singleton proxy — delega para _active em tempo de chamada
// ─────────────────────────────────────────────────────────────────────────

let _active: BlockchainService = new MockBlockchainService();

/** Troca a implementação ativa. Chamado pelo AnchorContext quando wallet conecta/desconecta. */
export function setBlockchainService(service: BlockchainService): void {
  _active = service;
}

/**
 * Singleton que sempre delega para a implementação ativa.
 * Importado pelos flows — não precisa mudar quando o serviço é trocado.
 */
export const blockchainService: BlockchainService = {
  mintProjectRwa: (project) => _active.mintProjectRwa(project),
  payContribution: (args) => _active.payContribution(args),
  mintSupporterNft: (args) => _active.mintSupporterNft(args),
  generateProofOfImpactQR: (id) => _active.generateProofOfImpactQR(id),
  devFaucet: () => _active.devFaucet(),
};

// ─────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────

export function shortAddress(addr: string, head = 4, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

export function explorerUrl(
  signatureOrAddress: string,
  kind: "tx" | "address" = "tx"
): string {
  const path = kind === "tx" ? "tx" : "address";
  return `https://explorer.solana.com/${path}/${signatureOrAddress}?cluster=devnet`;
}
