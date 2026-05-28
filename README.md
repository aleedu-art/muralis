# Muralis — Hackanation 2026

> dApp na Solana que tokeniza murais urbanos sustentáveis como RWAs.
> Hackathon: **TokenNation × Solana × Chainlink Labs** — trilha Payments, RWAs & Tokenização.
> Deadline: **02 de junho de 2026**.

## TL;DR — onde a gente parou

| Camada | Status | Onde |
|---|---|---|
| Frontend React (Next? não — **Vite**) com TS + Tailwind v4 | ✅ Funcional com mock blockchain | `muralis_code/` |
| Wallet Phantom (Devnet) | ✅ Real, conecta + lê saldo SOL | `muralis_code/src/components/SolanaProvider.tsx` |
| Mapa interativo dos murais (Leaflet + CARTO dark) | ✅ Novo | `muralis_code/src/pages/Map.tsx` |
| Estado global + persistência (localStorage) | ✅ React Context + Reducer | `muralis_code/src/state/MuralisContext.tsx` |
| Services layer (mock plugável) | ✅ `MockBlockchainService` | `muralis_code/src/services/blockchainService.ts` |
| Contrato `muralis_rwa` (NFT 1-of-1 do mural) | ✅ Escrito, **falta compilar e deployar** | `muralis_contracts/programs/muralis_rwa/` |
| Contrato `muralis_escrow` (USDC vault) | ✅ Escrito, **falta compilar e deployar** | `muralis_contracts/programs/muralis_escrow/` |
| Contrato `muralis_nft` (certificado de apoiador) | ✅ Escrito, **falta compilar e deployar** | `muralis_contracts/programs/muralis_nft/` |
| **Integração real frontend ↔ contratos** | ❌ A fazer | precisa criar `RealBlockchainService` |
| QR Code físico da Prova de Impacto | ❌ A fazer | tela `/impact/:id` já existe, só falta gerar o QR |
| Validação do claim da tinta (1m² ≈ 20 árvores) | ⏳ Pendente | precisa datasheet do fabricante |

## Estrutura do repositório

```
.
├── muralis_code/             ← frontend (Vite + React 19 + TS + Tailwind v4)
│   ├── src/
│   │   ├── App.tsx            roteamento + providers
│   │   ├── components/        Layout (header + bottom nav), SolanaProvider
│   │   ├── pages/             Home, Register, Details, Success, Impact, Wallet, Profile, Map
│   │   ├── state/             MuralisContext (Context + Reducer) + flows.ts
│   │   ├── services/          blockchainService (mock), storage (localStorage)
│   │   ├── utils/             uuid
│   │   ├── types.ts           Project, Contribution, SupporterNFT + SEED data
│   │   └── index.css          Tailwind v4 + design tokens
│   ├── package.json
│   └── vite.config.ts
│
├── muralis_contracts/        ← Anchor workspace (3 programas Rust)
│   ├── programs/
│   │   ├── muralis_rwa/       mint do NFT do mural + ProjectRegistry PDA
│   │   ├── muralis_escrow/    vault USDC/PYUSD + release
│   │   └── muralis_nft/       certificado de apoiador (mintado por contribuição)
│   ├── tests/                 testes TS para cada programa
│   ├── Anchor.toml
│   └── README.md              instruções detalhadas de build/deploy/integração
│
├── skills/                   ← skills personalizados (SKILL.md)
│   ├── startup-marketing/     framework de growth/marketing
│   ├── startup-founder/       framework de validação/MVP/pitch
│   └── solana-anchor-dev/     guia Anchor + Metaplex + integração frontend
│
├── PRD_Muralis.md            ← Product Requirements Document oficial
├── README.md                 ← este arquivo
└── AGENTS.md                 ← contexto pra agentes de IA (Antigravity, Claude Code, Cursor)
```

## Como rodar localmente

### Frontend

```bash
cd muralis_code
npm install --legacy-peer-deps      # --legacy-peer-deps por causa do React 19
npm run dev                          # http://localhost:3000
```

> Use `--legacy-peer-deps` porque algumas libs do ecossistema Solana ainda não
> declararam suporte oficial ao React 19. Funciona normal.

### Contratos (apenas se for compilar/deployar)

Pré-requisitos: Rust + Solana CLI + Anchor 0.30.1 + Node.

Doc oficial: https://solana.com/pt/docs/intro/installation

```bash
cd muralis_contracts
yarn install
anchor build
# pegar Program IDs reais do target/deploy/*-keypair.json,
# substituir declare_id! nos 3 lib.rs e em Anchor.toml,
# rebuild e deploy:
anchor build
solana airdrop 2
anchor deploy --provider.cluster devnet
anchor test --skip-local-validator --provider.cluster devnet
```

Detalhes completos em `muralis_contracts/README.md`.

## Próximos passos prioritários

Em ordem de impacto pro hackathon:

1. **Build + deploy dos 3 contratos no Devnet** (1-2 dias)
   - Substituir os `declare_id!` placeholder pelos IDs reais
   - Rodar `anchor test` localmente, depois `anchor deploy --provider.cluster devnet`
   - Copiar IDLs gerados pra `muralis_code/src/idl/`

2. **Criar `RealBlockchainService`** (1 dia)
   - Implementa a interface `BlockchainService` chamando os 3 programas reais
   - Substitui o singleton em `muralis_code/src/services/blockchainService.ts`
   - O resto do app não precisa mudar (services layer já está abstraído)

3. **Gerar QR Code na tela de Prova de Impacto** (algumas horas)
   - Adicionar `qrcode` ao package.json
   - Renderizar QR apontando para `https://muralis.app/mural/{id}` na `/impact/:id`

4. **Polir a demo** (1-2 dias)
   - Gravar vídeo da demo (mitigação contra instabilidade do Devnet ao vivo)
   - Pitch deck (5-7 slides) + roteiro
   - README do GitHub no padrão de hackathon

5. **Diferencial Chainlink** (1 dia — opcional mas vale pontos)
   - Integração mínima: price feed USDC/USD pra exibir valor em BRL
   - Ou: validação de geolocalização via Chainlink Functions

## Design system

Dark mode, accent verde neon, "Techno-Organic". Fonte: Sora (headings) + Inter (body). Vide `muralis_code/src/index.css` para todos os tokens CSS já configurados como variáveis Tailwind v4.

## Killer hook

A tinta fotocatalítica usada nos murais tem claim do fabricante de que **1m² absorve o equivalente a 20 árvores em CO₂**. Esse é o ângulo central da comunicação ESG. Ainda precisa validar a fonte do número.

## 👥 Time

*   **Alexandre Avelino** — Core Blockchain Developer & Software Architect
*   **Katia Suzue** — Co-Founder & Web3 Ecosystem Director (Founder of SuzueNFTAcademy)
*   **Marcos Lustosa** — Marketing, Growth & Developer Support
*   **Ras Junior** — Product Designer & Frontend QA Engineer

## 🌐 Smart Contract Deploy

| Programa | Program ID | Rede |
|---|---|---|
| `muralis_program` | `ECpeJjLyyGuK28Q3o7BmNt25K1eBi2sUt31qmbJy6zWB` | Devnet |

🔍 [Ver no Solana Explorer](https://explorer.solana.com/address/ECpeJjLyyGuK28Q3o7BmNt25K1eBi2sUt31qmbJy6zWB?cluster=devnet)

## Onde tirar dúvidas

- PRD com detalhes do produto: `PRD_Muralis.md`
- README dos contratos: `muralis_contracts/README.md`
- Contexto pros agentes de IA: `AGENTS.md`
- Design system de origem: stitch_muralis_arte_urbana_sustent_vel (na pasta do projeto)

---

Boa sorte e bom hack! 🟢🎨
