# AGENTS.md — Contexto para Agentes de IA (Antigravity / Claude Code / Cursor / Gemini)

> Este arquivo é a "memória" do projeto Muralis para qualquer agente de IA que abrir esta pasta.
> Antigravity, Claude Code, Cursor e Gemini CLI sabem ler arquivos como este (ou CLAUDE.md / GEMINI.md / .cursorrules) automaticamente.

## O que é este projeto

**Muralis** é uma dApp na Solana que tokeniza murais urbanos sustentáveis como RWAs (Real World Assets). Está sendo construída para o **Hackanation 2026** (TokenNation × Solana × Chainlink Labs), trilha **Payments, RWAs & Tokenização**. Deadline: **02 de junho de 2026**.

Cada mural físico vira um **NFT 1-of-1 na Solana** (Metaplex). Apoiadores financiam o projeto em frações via **USDC/PYUSD em escrow on-chain** e recebem um **NFT certificado** como prova de contribuição. Quando o mural é concluído, recebe um **QR Code físico** que conecta a parede real à página de Prova de Impacto on-chain.

Diferencial-chave: **tinta fotocatalítica** — claim do fabricante de que 1m² absorve o equivalente a 20 árvores em CO₂. Esse é o hook de marketing/ESG.

ODS-alvo: **11** (Cidades Sustentáveis) e **13** (Ação Climática).

## Estrutura física

```
muralis_code/         frontend Vite + React 19 + TS + Tailwind v4
muralis_contracts/    Anchor workspace com 3 programas Rust
skills/               SKILL.md files (contexto temático)
PRD_Muralis.md        spec oficial do produto
```

## Stack — fatos importantes

### Frontend (`muralis_code/`)
- **React 19** (atenção a peer deps — use `npm install --legacy-peer-deps`)
- **Vite 6** + **TypeScript 5.8**
- **Tailwind v4** via `@tailwindcss/vite` (CSS vars no `index.css` definem o design system)
- **@solana/wallet-adapter** (apenas Phantom configurada) + **@solana/web3.js**
- **Leaflet** (vanilla, não react-leaflet — pra evitar conflito de versão com React 19)
- **Framer Motion** (`motion` package)
- **react-router-dom v7**
- Estado global em `src/state/MuralisContext.tsx` (Context + useReducer + localStorage)

### Contratos (`muralis_contracts/`)
- **Anchor 0.30.1**
- **mpl-token-metadata** via `anchor-spl` com feature `metadata`
- **3 programas** independentes no mesmo workspace:
  - `muralis_rwa` — NFT 1-of-1 do mural + `ProjectRegistry` PDA (idempotência)
  - `muralis_escrow` — vault USDC/PYUSD parametrizado + status Active/Funded/Released
  - `muralis_nft` — certificado de apoiador por contribuição
- **Todos no Devnet.** Mainnet só depois de auditoria.
- Program IDs em `Anchor.toml` ainda são **placeholders** — precisam ser substituídos pelos IDs reais após o primeiro `anchor build`.

## Padrões de código a manter

### Frontend
- **Services layer obrigatório** — componentes React **NUNCA** chamam `@solana/web3.js` direto. Sempre via `blockchainService` (interface em `src/services/blockchainService.ts`). Pra ligar com contratos reais, criar `RealBlockchainService` implementando a mesma interface e trocar o singleton.
- **Fluxos centralizados** em `src/state/flows.ts` (ex.: `flowCreateProject`, `flowContribute`) — combinam services + dispatch de actions. Páginas chamam fluxos, não services direto.
- **Tipos rígidos** — `Project`, `Contribution`, `SupporterNFT`, `GeoLocation`, `ProjectStatus` em `src/types.ts`. Use sempre.
- **Idioma da UI:** Português (PT-BR). Variáveis e código em inglês.
- **Mobile-first** — bottom nav fixa, header com WalletMultiButton, layouts pensados em 380px primeiro.
- **Sem `any`** — TS strict (já configurado).
- **Sem `position: fixed`** em componentes novos a menos que indispensável (header e bottom nav usam, mas tem casos).

### Contratos
- **Sempre validar inputs** com `require!()` antes de mutar state.
- **PDAs imutáveis** — seeds derivadas só de inputs estáveis (project_id, etc.).
- **Eventos** — emit em toda operação relevante para indexers off-chain.
- **`Clock::get()?.unix_timestamp`** para timestamps — nunca confie no cliente.
- **`/// CHECK:`** doc comments em qualquer `UncheckedAccount`.
- **`#[derive(InitSpace)]`** + `space = 8 + Account::INIT_SPACE` para sizing.

## Anti-patterns a evitar

- ❌ Chamar `@solana/web3.js` direto em componentes React
- ❌ Hardcodar "Mainnet" em strings de UI (o provider está em **Devnet**)
- ❌ Adicionar libs Tailwind via `npm install tailwindcss-*` — usar **Tailwind v4 utilities only**
- ❌ Criar `<MotionDiv>` wrapper customizado — importar `motion` direto do package `motion/react`
- ❌ `useEffect` para coisas que deveriam estar em `flows.ts`
- ❌ Refundar via deletar PDA — adicionar instrução `refund` no escrow quando implementar

## Skills disponíveis (em `skills/`)

Três SKILL.md personalizados que dão contexto temático ao agente:

- `startup-marketing/SKILL.md` — frameworks de growth, KOLs, campanhas, posicionamento
- `startup-founder/SKILL.md` — Lean Canvas, MVP, GTM, pitch narrative
- `solana-anchor-dev/SKILL.md` — Anchor, Metaplex, PDAs, CPIs, integração frontend

Em Antigravity/Claude Code, esses arquivos são lidos automaticamente quando a feature é relevante.

## Estado atual do dev (handoff)

### Pronto
- UI completa das 8 telas (Home, Register, Details, Success, Impact, Map, Wallet, Profile)
- Wallet Phantom funcional no Devnet (lê saldo SOL real)
- Mock blockchain service que simula mint/contribute/release com latência realista
- Estado persistido em localStorage (refresh não perde projetos cadastrados)
- 3 contratos Anchor escritos com testes TS

### Falta (priorizado)
1. `anchor build` + `anchor deploy --provider.cluster devnet` dos 3 programas
2. Substituir `declare_id!` pelos Program IDs reais (em cada `lib.rs` + `Anchor.toml`)
3. Copiar IDLs gerados pra `muralis_code/src/idl/`
4. Criar `RealBlockchainService` implementando a interface (exemplo no `muralis_contracts/README.md`)
5. Trocar o singleton em `blockchainService.ts` do mock pro real
6. Gerar QR Code real na `Impact.tsx` (lib `qrcode`)
7. Polir demo: gravar vídeo, fazer pitch deck, melhorar README do GitHub
8. **Opcional (diferencial Chainlink Labs):** integração mínima de price feed ou Chainlink Functions

### Conhecido
- Bug Devnet/Mainnet em `Impact.tsx` linha 75 já **corrigido**
- `package.json` ainda tem nome `react-example` herdado do scaffold AI Studio — pode renomear pra `muralis` quando quiser
- `metadata.json` no root do frontend é do AI Studio — pode deletar
- `@google/genai` e `express` estão nas deps mas **não são usados** — podem ser removidos pra reduzir bundle

## Como o agente deve trabalhar

- Quando pedido pra adicionar feature, **respeita os padrões acima** (services layer, flows, tipos rígidos).
- Quando criar contrato novo, segue o padrão dos 3 existentes (InitSpace, eventos, errors, validações).
- Em caso de dúvida sobre stack, **lê o README de muralis_contracts** ou o SKILL.md de `solana-anchor-dev`.
- Pra qualquer mudança na blockchain (novo programa, nova instrução), atualiza também o `BlockchainService` interface no frontend.
- Antes de subir pra Mainnet: auditoria + multisig upgrade authority. **Nunca subir direto.**

## Contato

- **Marcos** — Marketing/growth + dev support, fala PT/EN
- Time crescendo na fase de hackathon

Boa! 🟢
