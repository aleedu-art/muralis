/**
 * Flows — Orquestração de alto nível dos fluxos do produto.
 *
 * Cada função aqui combina chamadas de service + dispatch de actions no Context,
 * tratando a sequência completa (DB → blockchain → state update).
 *
 * Quando os contratos forem integrados, trocar `MockBlockchainService` por
 * `RealBlockchainService` no MuralisContext — esses flows não precisam mudar.
 */

import { v4 as uuid } from "../utils/uuid";
import type { Project, Contribution, SupporterNFT, GeoLocation } from "../types";
import { calculateImpact } from "../types";
import { blockchainService, type DevFaucetResult } from "../services/blockchainService";

// ─────────────────────────────────────────────────────────────────────────
// Flow: Cadastrar um novo projeto (artista)
// ─────────────────────────────────────────────────────────────────────────

export interface CreateProjectInput {
  title: string;
  description: string;
  artist: string;
  artistWallet: string;
  widthMeters: number;
  heightMeters: number;
  paintLiters: number;
  location: GeoLocation;
  goalUsdc: number;
  budgetBreakdown?: string;
  image: string;
  daysRemaining?: number;
}

export interface CreateProjectResult {
  project: Project;
  rwaTxSignature: string;
}

export async function flowCreateProject(
  input: CreateProjectInput
): Promise<CreateProjectResult> {
  const area = +(input.widthMeters * input.heightMeters).toFixed(2);
  const impact = calculateImpact(area);

  const draft: Project = {
    id: uuid(),
    title: input.title,
    artist: input.artist,
    artistWallet: input.artistWallet,
    description: input.description,
    image: input.image,
    widthMeters: input.widthMeters,
    heightMeters: input.heightMeters,
    area,
    paintLiters: input.paintLiters,
    co2PerYear: impact.co2PerYear,
    treeEquivalent: impact.treeEquivalent,
    location: input.location,
    goalUsdc: input.goalUsdc,
    raisedUsdc: 0,
    supporterCount: 0,
    daysRemaining: input.daysRemaining ?? 30,
    budgetBreakdown: input.budgetBreakdown,
    status: "draft",
    verified: false,
    ods: [11, 13],
    createdAt: new Date().toISOString(),
  };

  // 1. Minta o RWA na Solana (mock por enquanto)
  const { tokenAddress, txSignature } = await blockchainService.mintProjectRwa(draft);

  // 2. Retorna o projeto com os campos da blockchain preenchidos
  const project: Project = {
    ...draft,
    tokenAddress,
    rwaTxSignature: txSignature,
    status: "funding",
    verified: true,
  };

  return { project, rwaTxSignature: txSignature };
}

// ─────────────────────────────────────────────────────────────────────────
// Flow: Contribuir com um projeto (apoiador)
// ─────────────────────────────────────────────────────────────────────────

export interface ContributeInput {
  project: Project;
  supporterWallet: string;
  amountUsdc: number;
}

export interface ContributeResult {
  contribution: Contribution;
  nft: SupporterNFT;
}

export async function flowContribute(input: ContributeInput): Promise<ContributeResult> {
  const { project, supporterWallet, amountUsdc } = input;

  // 1. Paga em USDC (transferência SPL Token, mock por enquanto)
  const { txSignature: paymentTxSignature } = await blockchainService.payContribution({
    projectId: project.id,
    supporterWallet,
    amountUsdc,
  });

  // 2. Minta NFT certificado de apoiador
  const { mintAddress, metadataUri } = await blockchainService.mintSupporterNft({
    project,
    supporterWallet,
    amountUsdc,
  });

  const now = new Date().toISOString();

  const contribution: Contribution = {
    id: uuid(),
    projectId: project.id,
    supporterWallet,
    amountUsdc,
    paymentTxSignature,
    supporterNftMint: mintAddress,
    createdAt: now,
  };

  const nft: SupporterNFT = {
    mint: mintAddress,
    owner: supporterWallet,
    projectId: project.id,
    contributionId: contribution.id,
    amountUsdc,
    metadataUri,
    createdAt: now,
  };

  return { contribution, nft };
}

// ─────────────────────────────────────────────────────────────────────────
// Flow: Marcar projeto como concluído (gera QR + completedAt)
// ─────────────────────────────────────────────────────────────────────────

export async function flowCompleteProject(projectId: string): Promise<{
  qrTargetUrl: string;
  completedAt: string;
}> {
  const qrTargetUrl = await blockchainService.generateProofOfImpactQR(projectId);
  return { qrTargetUrl, completedAt: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────
// Flow: Dev Faucet — airdrop SOL + mint USDC local (localhost only)
// ─────────────────────────────────────────────────────────────────────────

export async function flowDevFaucet(): Promise<DevFaucetResult> {
  return blockchainService.devFaucet();
}
