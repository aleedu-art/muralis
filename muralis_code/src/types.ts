/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Muralis — Domain types
 */

export type ProjectStatus =
  | "draft"             // criado mas ainda não mintado
  | "funding"           // mintado, aceitando contribuições
  | "funded"            // meta atingida, aguardando execução
  | "executing"         // obra em execução
  | "completed";        // obra concluída + QR Code gerado

/** Geolocalização do mural */
export interface GeoLocation {
  lat: number;
  lng: number;
  city: string;
  state: string;
  country: string;
  /** endereço descritivo opcional (rua, bairro) */
  address?: string;
}

/** Projeto de mural (RWA) */
export interface Project {
  /** UUID gerado no frontend (depois substituído pelo Mint do RWA) */
  id: string;
  title: string;
  artist: string;
  /** wallet do artista (pubkey base58) */
  artistWallet: string;
  description: string;
  image: string;
  /** dimensões físicas */
  widthMeters: number;
  heightMeters: number;
  area: number; // m² (calculado)
  /** litros de tinta fotocatalítica */
  paintLiters: number;
  /** absorção estimada (kg de CO₂ por ano) */
  co2PerYear: number;
  /** equivalência simbólica em árvores (claim: 1m² ≈ 20 árvores) */
  treeEquivalent: number;
  location: GeoLocation;
  /** meta de financiamento (em USDC, 6 decimais) */
  goalUsdc: number;
  /** total arrecadado (USDC) */
  raisedUsdc: number;
  /** quantidade de apoiadores únicos */
  supporterCount: number;
  /** dias até a deadline de financiamento */
  daysRemaining?: number;
  /** detalhamento do orçamento (texto livre) */
  budgetBreakdown?: string;
  /** endereço do mint do token RWA na Solana (preenchido após mintagem) */
  tokenAddress?: string;
  /** signature da tx de mintagem do RWA */
  rwaTxSignature?: string;
  status: ProjectStatus;
  verified: boolean;
  ods: number[];
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp da finalização (preenchido quando status = completed) */
  completedAt?: string;
}

/** Contribuição de um apoiador a um projeto */
export interface Contribution {
  id: string;
  projectId: string;
  /** wallet do apoiador (pubkey base58) */
  supporterWallet: string;
  amountUsdc: number;
  /** signature da tx de pagamento USDC */
  paymentTxSignature: string;
  /** mint do NFT de apoiador gerado para essa contribuição */
  supporterNftMint: string;
  /** ISO timestamp */
  createdAt: string;
}

/** NFT certificado de apoiador (Metaplex) */
export interface SupporterNFT {
  mint: string;
  owner: string;
  projectId: string;
  contributionId: string;
  amountUsdc: number;
  metadataUri: string;
  createdAt: string;
}

/** Estado consolidado por wallet */
export interface UserSummary {
  wallet: string;
  myProjectIds: string[];      // como artista
  myContributionIds: string[]; // como apoia
}

export const TREES_PER_SQUARE_METER = 20; // Claim: 1m² ≈ 20 árvores

export function calculateImpact(areaMeters: number) {
  const co2PerYear = Number((areaMeters * 0.02).toFixed(2));
  const treeEquivalent = Math.round(areaMeters * TREES_PER_SQUARE_METER);
  return { co2PerYear, treeEquivalent };
}

export const SEED_PROJECTS: Project[] = [
  {
    id: "1",
    title: "Jardim das Américas #001",
    artist: "Luan Silva",
    artistWallet: "ArTiSt111111111111111111111111111111111111",
    description: "Esta obra visa revitalizar o centro urbano através de uma narrativa visual que celebra a biodiversidade brasileira. Utilizando tintas fotocatalíticas que absorvem poluentes, este mural não apenas embeleza a cidade, mas atua como um pulmão artificial.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBwsfgVvMEkFN8NOvkbJBjxrsynHl-_sbE7DBFBI2j4Yy7KkphMOG1mLymapCWIqQ0uQz94O7gcjSJYVtrAML1zUssYkMvKQzc86nEiDSezO4rU3PL4uo-mmdj4TItW3GGGt7ieaVnbcQiQhaq6FlQSly8Vv9n1c0Miid7DvHpGBrVwTRpNJoJUNMq9tJTewS0bRuFNKL1RE0Xuz5k39vciuiE1SOkd9nJ88JA5NVy9B0heOlEUudWJj9OHOjkjZ0s8WcIuthzz4Ynn",
    widthMeters: 12,
    heightMeters: 10,
    area: 120,
    paintLiters: 60,
    co2PerYear: 2.4,
    treeEquivalent: 2400,
    location: {
      lat: -23.5505,
      lng: -46.6333,
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      address: "Av. Paulista, 1000"
    },
    goalUsdc: 500,
    raisedUsdc: 335,
    supporterCount: 12,
    daysRemaining: 8,
    status: "funding",
    verified: true,
    ods: [11, 13],
    createdAt: "2026-04-20T10:00:00Z",
    tokenAddress: "MurAL1sJardim001"
  },
  {
    id: "2",
    title: "Eco-Graffiti Centro",
    artist: "Ana Bloom",
    artistWallet: "ArTiSt222222222222222222222222222222222222",
    description: "Arte urbana contemporânea em Curitiba com uma mistura de padrões de folhas orgânicas e motivos tecnológicos em um esquema de cores verde neon e obsidiana profunda.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDiUl1BRqZHTmE8uilOZ7-KfmYPzZxWsKPQVUIL4_yJeqtdqHf8SmjwusXEH2p-zr9knzRzGdksemYtMcD3ABpY9RxyLvTTBBkzF_bd1Hzp4rpXamhO065C7ZosjZHqpwkQocctNkBbltvAHJ_Y8_C8o6ICC62TQFU_vXSeMGdU1KRhJ3c4LJ9hcom-mx0IZX8uJ-oY6dz3ZeDZlr1g9DoXYrrZIMwnsI8BQtQADjSlOFAOJlkifiWqFzEp42-4TxwKiV3aESE2jcZ1",
    widthMeters: 10,
    heightMeters: 8,
    area: 80,
    paintLiters: 40,
    co2PerYear: 1.6,
    treeEquivalent: 1600,
    location: {
      lat: -25.4290,
      lng: -49.2671,
      city: "Curitiba",
      state: "PR",
      country: "Brasil",
      address: "Rua das Flores, 50"
    },
    goalUsdc: 1000,
    raisedUsdc: 450,
    supporterCount: 8,
    daysRemaining: 15,
    status: "funding",
    verified: true,
    ods: [11, 13],
    createdAt: "2026-04-22T10:00:00Z"
  },
  {
    id: "3",
    title: "Mural da Vila",
    artist: "Deko",
    artistWallet: "ArTiSt333333333333333333333333333333333333",
    description: "Um mural imponente caracterizado por elementos de arte urbana de alto contraste em preto e branco com detalhes verdes intensos.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCtwZVZL767ho4tVITVRsnMqCkFPot7SHnO-Iw9ZkgL2Uj7olcVAKBXF5teyN8YMe2pcKVKrBD6X-t7fMtIYbNBS4W59PiT8gLo0B1OQPdOJ3b3oh5ne6I4XuB0dkc1hh8_HsyDKcjXlOwYHnWeWhqVXadRlI4M9nhV2pFibywt-CigjGMrIkmCglMXgz8uuRYIJpbPZ7sbFO-eMkhxoLD67fzhD2dX-Jq2Xcu65vdx2e935uLgvAVt8gd-HMzvn2ChtGhN6m17nTee",
    widthMeters: 20,
    heightMeters: 10,
    area: 200,
    paintLiters: 100,
    co2PerYear: 4.0,
    treeEquivalent: 4000,
    location: {
      lat: -8.0543,
      lng: -34.8813,
      city: "Recife",
      state: "PE",
      country: "Brasil",
      address: "Marco Zero, S/N"
    },
    goalUsdc: 2000,
    raisedUsdc: 2000,
    supporterCount: 45,
    daysRemaining: 0,
    status: "completed",
    verified: true,
    ods: [11, 13],
    createdAt: "2026-04-18T10:00:00Z",
    completedAt: "2026-05-01T12:00:00Z",
    tokenAddress: "MurAL1sVila003"
  }
];