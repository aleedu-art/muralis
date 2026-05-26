# Muralis — Solana Programs

Anchor workspace para os programas Solana do projeto Muralis.

## Programas

| Programa | Propósito | Status |
|---|---|---|
| `muralis_rwa` | Mintagem do token RWA do projeto/mural (1-of-1 Metaplex NFT) | ✅ Implementado |
| `muralis_escrow` | Escrow de USDC/PYUSD por projeto (vault + release) | ✅ Implementado |
| `muralis_nft` | Mintagem do NFT de apoiador (Certificado de Contribuição) | ✅ Implementado |

---

## Fluxo combinado dos 3 programas

```
┌────────────────────────┐
│  ARTISTA cadastra o    │
│  projeto no Muralis    │
└───────────┬────────────┘
            │
            ▼
   ┌────────────────────┐
   │ 1. muralis_rwa     │
   │   mint_project_rwa │  ──▶ NFT do mural mintado (1-of-1)
   └────────┬───────────┘       Registry PDA criada (idempotência)
            │
            ▼
   ┌────────────────────┐
   │ 2. muralis_escrow  │
   │  initialize_escrow │  ──▶ Vault PDA aberto para receber USDC
   └────────┬───────────┘
            │
            │   APOIADORES contribuem
            ▼
   ┌────────────────────┐       ┌──────────────────────┐
   │   contribute()     │ ◀───▶ │   muralis_nft        │
   │   (USDC → vault)   │       │  mint_supporter_     │
   │   raised += amount │       │  certificate         │
   │   if >= target →   │       │  (NFT-certificado)   │
   │   status=Funded    │       └──────────────────────┘
   └────────┬───────────┘
            │
            ▼  (quando Funded)
   ┌────────────────────┐
   │      release()     │  ──▶ Vault esvaziado para o artista
   │      Released      │
   └────────┬───────────┘
            │
            ▼
   ┌────────────────────┐
   │   mark_completed   │  ──▶ Mural concluído + QR Code físico
   │   (muralis_rwa)    │
   └────────────────────┘
```

---

## Pré-requisitos

Doc oficial: https://solana.com/pt/docs/intro/installation

```bash
# 1. Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# 3. Anchor (via avm)
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.30.1
avm use 0.30.1

# 4. Node.js (testes TS)
nvm install --lts
```

Verifique:
```bash
rustc --version       # 1.75+
solana --version      # 1.18+
anchor --version      # 0.30.1
node --version        # 18+ ou 20+
```

---

## Configurar Devnet

```bash
solana config set --url https://api.devnet.solana.com
solana-keygen new --outfile ~/.config/solana/id.json
solana airdrop 2
solana balance
```

---

## Build & Test

```bash
yarn install                     # ou npm install
anchor build                     # builda os 3 programas
anchor test                      # local validator
anchor test --skip-local-validator --provider.cluster devnet   # contra Devnet
```

> ⚠️ **Após `anchor build`**, copie os Program IDs reais do `target/deploy/*-keypair.json`
> para o `declare_id!` em cada `lib.rs` e para `Anchor.toml`. Aí faça `anchor build` de novo
> (com os IDs corretos) e depois `anchor deploy`.

---

## Deploy no Devnet

```bash
anchor build

# Pegar os Program IDs reais (um para cada programa)
solana address -k target/deploy/muralis_rwa-keypair.json
solana address -k target/deploy/muralis_escrow-keypair.json
solana address -k target/deploy/muralis_nft-keypair.json

# Atualizar declare_id! em cada lib.rs e os campos [programs.devnet] do Anchor.toml
# Depois:
anchor build
anchor deploy --provider.cluster devnet
```

---

## Integração com o frontend

Após cada `anchor build`, copie IDLs e tipos:

```bash
mkdir -p ../muralis_code/src/idl
cp target/idl/muralis_rwa.json    ../muralis_code/src/idl/
cp target/idl/muralis_escrow.json ../muralis_code/src/idl/
cp target/idl/muralis_nft.json    ../muralis_code/src/idl/
cp target/types/muralis_rwa.ts    ../muralis_code/src/idl/
cp target/types/muralis_escrow.ts ../muralis_code/src/idl/
cp target/types/muralis_nft.ts    ../muralis_code/src/idl/
```

No `muralis_code`, criar `src/services/realBlockchainService.ts` implementando
a interface `BlockchainService` (já definida em `blockchainService.ts`) com
chamadas reais aos 3 programas. Depois trocar o singleton:

```ts
// src/services/blockchainService.ts
// export const blockchainService = new MockBlockchainService();
export const blockchainService = new RealBlockchainService(connection, wallet);
```

---

## Detalhe de cada programa

### `muralis_rwa`

Instruções:
- `mint_project_rwa(project_id, name, symbol, uri, area_sq_meters, co2_kg_per_year_x1000, target_usdc)`
  Cria o registry PDA + minta o NFT 1-of-1 com Metaplex metadata e master edition.
- `mark_completed()` — stamp on-chain quando a obra física é finalizada.

PDAs:
- `[b"project", project_id]` → `ProjectRegistry` (idempotência: 1 RWA por project_id)

### `muralis_escrow`

Instruções:
- `initialize_escrow(project_id, target_amount, deadline_ts)`
- `contribute(amount)` — transfere USDC do apoiador → vault; auto-flip para `Funded`
- `release()` — esvazia vault → ATA do artista

PDAs:
- `[b"escrow", project_id]` → `EscrowState`
- `[b"vault", project_id]` → SPL TokenAccount com `authority = EscrowState PDA`

Status enum: `Active → Funded → Released`

> Refund (caso deadline expire sem atingir meta) está **fora do escopo do MVP**.
> Adicionar pós-hackathon com per-contribution accounting.

### `muralis_nft`

Instruções:
- `mint_supporter_certificate(project_id, contribution_amount, name, symbol, uri)`

Minta um NFT certificado (1-of-1 com master edition) para o apoiador, contendo
metadata off-chain com valor contribuído, projeto, m², CO₂, ODS, etc.

---

## Exemplo combinado de uso no frontend

```ts
// 1. Artista cria projeto + minta RWA + abre escrow (idealmente em 1 tx via instructions[])
const projectId = `mural-${slugify(title)}-${Date.now()}`;

const rwaTx = await muralisRwa.methods
  .mintProjectRwa(projectId, title, "MURPROJ", metadataUri, area, co2x1000, target)
  .accounts({ ... })
  .signers([rwaMintKp])
  .rpc();

const escrowTx = await muralisEscrow.methods
  .initializeEscrow(projectId, target, deadline)
  .accounts({ ... })
  .rpc();

// 2. Apoiador contribui (em UMA chamada combinada idealmente)
const contribTx = await muralisEscrow.methods
  .contribute(amount)
  .accounts({ ... })
  .rpc();

const supporterNftTx = await muralisNft.methods
  .mintSupporterCertificate(projectId, amount, "Supporter Cert", "MURSUP", supporterMetaUri)
  .accounts({ ... })
  .signers([supporterMintKp])
  .rpc();

// 3. Quando meta atingida, artista libera + marca concluído
const releaseTx = await muralisEscrow.methods.release().accounts({ ... }).rpc();
const completeTx = await muralisRwa.methods.markCompleted().accounts({ ... }).rpc();
```

---

## Estrutura do JSON de metadados off-chain

A `uri` passada aos programas deve apontar para um JSON nesse formato (hospedado em Arweave/IPFS):

```json
{
  "name": "Muralis #001 — Jardim das Américas",
  "symbol": "MURPROJ",
  "description": "Mural urbano sustentável de 120m² em São Paulo. Tinta fotocatalítica.",
  "image": "https://arweave.net/<hash>/jardim-das-americas.png",
  "external_url": "https://muralis.app/mural/jardim-das-americas-001",
  "attributes": [
    { "trait_type": "Área (m²)", "value": "120" },
    { "trait_type": "CO₂ absorvido (kg/ano)", "value": "2.4" },
    { "trait_type": "Equivalência (árvores)", "value": "2400" },
    { "trait_type": "Localização", "value": "São Paulo, SP" },
    { "trait_type": "Artista", "value": "Luan Silva" },
    { "trait_type": "ODS", "value": "11, 13" },
    { "trait_type": "Orçamento (USDC)", "value": "500" }
  ]
}
```

---

## Próximos passos (pós-hackathon)

1. Per-contribution accounting + `refund()` no `muralis_escrow` (caso a meta não seja atingida)
2. Multisig upgrade authority antes de Mainnet
3. Integração Chainlink: price feed USDC/USD + validação de geolocalização (diferencial Chainlink Labs)
4. Auditoria de segurança independente
5. Compressed NFTs (cNFT) para o certificado de apoiador, caso o volume justifique
6. Suporte nativo a PYUSD além do USDC (já parametrizado via `payment_mint`)
