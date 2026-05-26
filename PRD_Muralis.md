# PRD — Muralis: Tokenização de Arte Urbana para Cidades Sustentáveis

> **Versão:** 1.0  
> **Data:** Maio de 2026  
> **Hackathon:** Hackanation 2026 — TokenNation × Solana × Chainlink Labs  
> **Trilha:** Payments, RWAs & Tokenização (Solana)  
> **Status:** MVP para Demo

---

## 1. Sumário Executivo

**Muralis** é uma plataforma dApp na rede Solana que transforma projetos de murais urbanos sustentáveis em Ativos Reais Tokenizados (RWA). Artistas cadastram suas obras físicas, que são mintadas como tokens na blockchain. Empresas e apoiadores financiam a execução de forma fracionada via stablecoins (USDC/PYUSD), com os fundos protegidos em contratos de escrow. Após a conclusão, a obra recebe um QR Code físico que conecta o mural real ao seu registro imutável na blockchain — criando prova pública de impacto socioambiental.

O projeto está alinhado com as **ODS 11** (Cidades e Comunidades Sustentáveis) e **ODS 13** (Ação Contra a Mudança Global do Clima), com potencial de disputar tanto o prêmio principal da trilha Solana quanto prêmios temáticos de impacto social do Hackanation 2026.

---

## 2. Contexto e Problema

### 2.1 O Problema do Artista Urbano

Artistas que atuam na revitalização de espaços urbanos degradados enfrentam barreiras concretas:

- **Falta de financiamento:** tintas fotocatalíticas (que absorvem CO₂) são caras e não há canais de crowdfunding especializados.
- **Invisibilidade do impacto:** não existe registro auditável e público das contribuições ambientais e culturais geradas pelos murais.
- **Ausência de reconhecimento formal:** o artista não possui comprovação tokenizada de sua produção artística.

### 2.2 O Problema das Empresas de ESG

Empresas que buscam investir em ações de impacto socioambiental local não encontram:

- Um canal **direto e transparente** para financiar projetos de arte urbana.
- A possibilidade de participação **fracionada** com valores pequenos.
- **Rastreabilidade on-chain** do uso dos recursos e do impacto gerado.

### 2.3 O Problema das Cidades

Espaços urbanos degradados afetam a segurança, o bem-estar e o microclima local. A arte de rua com tintas fotocatalíticas tem potencial comprovado de:

- Absorver poluentes atmosféricos e CO₂.
- Reduzir a percepção de insegurança e aumentar o orgulho comunitário.
- Gerar dados públicos e auditáveis sobre impacto ambiental urbano.

---

## 3. Solução

Uma plataforma web3 na rede Solana onde:

1. **Artistas** cadastram projetos de murais via formulário web.
2. A plataforma **minta o projeto como um RWA** (Ativo Real Tokenizado) na Solana.
3. **Apoiadores e empresas** compram frações do projeto usando USDC ou PYUSD.
4. Os fundos ficam em **escrow** até o valor-alvo ser atingido.
5. Ao completar, o artista recebe os fundos e executa a obra.
6. A obra física recebe um **QR Code** vinculado ao token na blockchain — entregando Proof of Impact público.

---

## 4. Objetivos do Produto (OKRs para o Hackathon)

| Objetivo | Resultado-Chave |
|----------|----------------|
| Demonstrar viabilidade técnica do RWA na Solana | Mintar ao menos 1 token de projeto no Devnet durante a demo |
| Validar o fluxo de pagamentos fracionados | Simular aporte de 5 USDC de um apoiador no frontend |
| Demonstrar Proof of Impact | Gerar QR Code que aponta para a página do token com metadados completos |
| Apresentar alinhamento com ODS 11 e 13 | Exibir métricas de m² revitalizados e estimativa de absorção de CO₂ na UI |

---

## 5. Usuários e Personas

### Persona 1 — Artista Urbano (Cadastrador)
- **Quem é:** grafiteiro ou muralista com projetos em andamento ou planejados.
- **Dor:** não consegue financiar materiais caros nem comprovar seu impacto ambiental.
- **O que faz na plataforma:** cadastra a obra, define o orçamento em USDC, faz upload do esboço.
- **Expectativa:** receber os fundos de forma transparente e ter seu trabalho reconhecido on-chain.

### Persona 2 — Apoiador / Empresa ESG (Financiador)
- **Quem é:** empresa local ou indivíduo engajado com causas de impacto urbano e ambiental.
- **Dor:** não encontra projetos locais confiáveis e rastreáveis para investir.
- **O que faz na plataforma:** navega pelos projetos, escolhe quanto aportar (mínimo: 5 USDC), recebe um NFT de apoiador.
- **Expectativa:** transparência total do uso dos fundos e prova de impacto registrada na blockchain.

### Persona 3 — Cidadão (Consumidor de Impacto)
- **Quem é:** qualquer pessoa que passa pela rua e escaneia o QR Code do mural.
- **O que vê:** página do token com foto do mural, m² revitalizados, localização, apoiadores e estimativa de CO₂ absorvido.
- **Expectativa:** entender o projeto de forma simples e intuitiva.

---

## 6. Fluxo do Usuário (User Stories)

### Epic 1 — Cadastro do Artista

**US-01:** Como artista, quero acessar um formulário web para cadastrar meu projeto de mural.  
**US-02:** Como artista, quero inserir título, dimensões (m²), conceito, localização (geolocalização) e foto do esboço.  
**US-03:** Como artista, quero definir o orçamento necessário em USDC para materiais e cachê.  
**US-04:** Como artista, quero que a plataforma gere automaticamente os metadados JSON do meu projeto.

**Critérios de aceite (US-01 a US-04):**
- Formulário funcional com campos validados.
- JSON de metadados gerado no padrão Metaplex da Solana.
- Dados salvos e projeto mintado no Devnet.

---

### Epic 2 — Mintagem do RWA

**US-05:** Como plataforma, quero mintar o projeto do artista como um token RWA na Solana com metadados completos (título, m², localização, estimativa CO₂, URI da imagem).  
**US-06:** Como plataforma, quero que o token reflita o status "aguardando financiamento" após a mintagem.

**Critérios de aceite:**
- Token mintado no Devnet com metadados válidos.
- Endereço do token exibido ao artista após mintagem.
- Status on-chain verificável via Solana Explorer.

---

### Epic 3 — Financiamento Coletivo (Payments)

**US-07:** Como apoiador, quero visualizar os projetos disponíveis com seus dados de impacto e progresso de financiamento.  
**US-08:** Como apoiador, quero conectar minha Phantom Wallet e aportar USDC ou PYUSD em frações.  
**US-09:** Como plataforma, quero que os fundos aportados fiquem travados em um contrato de escrow até o valor-alvo ser atingido.  
**US-10:** Como apoiador, quero receber um NFT de apoiador que comprova minha contribuição.

**Critérios de aceite:**
- Integração com Phantom Wallet funcionando.
- Transação USDC no Devnet executada com sucesso.
- Contrato de escrow retendo os fundos corretamente.
- NFT de apoiador mintado após o aporte.

---

### Epic 4 — Liberação de Fundos e Proof of Impact

**US-11:** Como plataforma, quero liberar os fundos do escrow para o artista automaticamente ao atingir o valor-alvo.  
**US-12:** Como artista, quero receber uma notificação de que os fundos foram liberados e a execução pode começar.  
**US-13:** Como plataforma, quero gerar um QR Code único para o mural físico após a conclusão da obra.  
**US-14:** Como cidadão, quero escanear o QR Code e ver a página do token com todos os metadados, foto do mural concluído e lista de apoiadores.

**Critérios de aceite:**
- Escrow libera fundos ao atingir 100% do valor-alvo.
- QR Code gerado e funcional.
- Página do token exibe: foto, m², localização, CO₂ estimado, apoiadores e endereço on-chain.

---

## 7. Arquitetura Técnica (MVP)

### 7.1 Stack

| Camada | Tecnologia |
|--------|-----------|
| Blockchain | Solana (Devnet para demo) |
| Smart Contracts | Anchor Framework (Rust) |
| Tokens / RWA | Metaplex Token Metadata Standard |
| Stablecoins | USDC SPL Token / PYUSD |
| Frontend | Next.js + TypeScript |
| Wallet Integration | Phantom Wallet + @solana/wallet-adapter |
| Storage de Imagens | Arweave ou IPFS (URI nos metadados) |
| Backend / API | Node.js (serverless functions) |

### 7.2 Contratos Inteligentes

**Contrato 1 — Projeto RWA:**
- `create_project(title, m2, location, co2_estimate, target_amount, metadata_uri)` — minta o token do projeto.
- `get_project_status()` — retorna status e progresso do financiamento.

**Contrato 2 — Escrow de Financiamento:**
- `contribute(amount)` — recebe USDC/PYUSD do apoiador e trava no escrow.
- `release_funds()` — libera para o artista quando 100% atingido.
- `refund()` — devolve fundos se prazo expirar sem atingir a meta (não obrigatório no MVP).

**Contrato 3 — NFT de Apoiador:**
- `mint_supporter_nft(contributor_wallet)` — minta o NFT de reconhecimento ao apoiador.

### 7.3 Estrutura de Metadados JSON (Padrão Metaplex)

```json
{
  "name": "Muralis #001 — Jardim das Américas",
  "symbol": "MURALIS",
  "description": "Mural urbano sustentável de 120m² na Rua das Flores, São Paulo. Tinta fotocatalítica com absorção estimada de 2,4kg de CO₂/ano.",
  "image": "https://arweave.net/<hash>/esboço.png",
  "attributes": [
    { "trait_type": "Área (m²)", "value": "120" },
    { "trait_type": "Localização", "value": "23.5505° S, 46.6333° O" },
    { "trait_type": "Absorção CO₂ (kg/ano)", "value": "2.4" },
    { "trait_type": "Orçamento (USDC)", "value": "500" },
    { "trait_type": "Status", "value": "Aguardando Financiamento" },
    { "trait_type": "Artista", "value": "nome_do_artista" },
    { "trait_type": "ODS", "value": "11, 13" }
  ],
  "external_url": "https://muralis.app/token/001"
}
```

---

## 8. Funcionalidades do MVP (Escopo da Demo)

### In Scope (Obrigatório para o Hackathon)

- Formulário de cadastro do artista (frontend funcional).
- Geração automática de metadados JSON.
- Mintagem do token RWA no Devnet da Solana.
- Tela de listagem de projetos com progresso de financiamento.
- Integração com Phantom Wallet.
- Simulação de aporte em USDC (Devnet).
- Contrato de escrow básico.
- Geração de QR Code vinculado à página do token.
- Página pública do token (Proof of Impact).

### Out of Scope (Pós-Hackathon)

- Integração com APIs de geolocalização avançada.
- Validação de orçamento por terceiros.
- Sistema de reputação do artista.
- Mecanismo de refund automático por prazo.
- Deploy em Mainnet.
- App mobile nativo.

---

## 9. Design e UX

### Princípios de Design

- **Clareza sobre complexidade:** o usuário não precisa entender blockchain para usar a plataforma.
- **Impacto visual:** dados ambientais (m², CO₂) sempre em destaque.
- **Mobile first:** a maioria dos cidadãos vai escanear o QR Code pelo celular.

### Telas do MVP

| Tela | Descrição |
|------|-----------|
| Home | Lista de projetos com progresso de financiamento e dados de impacto |
| Cadastro do Artista | Formulário com upload de esboço, geolocalização e orçamento |
| Página do Projeto | Detalhes completos, barra de progresso e botão "Apoiar" |
| Confirmação de Aporte | Resumo da transação + mintagem do NFT de apoiador |
| Proof of Impact | Página pública acessada via QR Code com todos os metadados |

---

## 10. Métricas de Sucesso

| Métrica | Meta para o MVP |
|---------|----------------|
| Projetos mintados no Devnet | ≥ 1 durante a demo |
| Transações de aporte simuladas | ≥ 3 contribuições distintas na demo |
| Tempo de cadastro até mintagem | < 3 minutos |
| QR Code funcional | Redireciona corretamente para a página do token |
| Clareza da UI para não-cripto | Avaliação positiva pelos jurados na apresentação |

---

## 11. Roadmap de Desenvolvimento

### Fase 1 — MVP do Hackathon (Até 2 de Junho de 2026)

**Semana 1 (Desenvolvimento de Contratos):**
- Configurar ambiente Anchor + Solana CLI.
- Desenvolver e testar contratos de Projeto RWA e Escrow no Devnet.
- Integrar Metaplex para mintagem de tokens.

**Semana 2 (Frontend e Integração):**
- Desenvolver frontend Next.js com formulário de cadastro.
- Integrar Phantom Wallet Adapter.
- Conectar frontend aos contratos via @solana/web3.js.
- Implementar geração de QR Code e página de Proof of Impact.

**Semana 3 (Polimento e Demo):**
- Refinamento de UX e dados de impacto.
- Preparar roteiro de demonstração em vídeo.
- Simular fluxo completo: cadastro → mintagem → aporte → QR Code.
- Preparar pitch e documentação do projeto.

---

## 12. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Instabilidade do Devnet da Solana durante a demo | Média | Alto | Gravar vídeo de demo antecipadamente |
| Complexidade do contrato de escrow | Alta | Alto | Usar escrow simplificado (sem refund no MVP) |
| Integração USDC no Devnet com faucet limitado | Média | Médio | Usar tokens USDC de teste via Solana Devnet faucet |
| Tempo insuficiente para frontend polido | Média | Médio | Priorizar funcionalidade sobre design |
| Metadados com formato inválido | Baixa | Alto | Validar JSON contra schema Metaplex antes da mintagem |

---

## 13. Alinhamento com o Hackanation 2026

### Trilha Principal
**Payments, RWAs & Tokenização (Solana)**
- RWA: murais físicos georreferenciados tokenizados on-chain.
- Payments: financiamento coletivo com USDC/PYUSD via escrow na Solana.
- Tokenização: Metaplex Token Metadata Standard com metadados ricos.

### Co-hosts
- **Solana:** uso intensivo da rede (contratos Anchor, SPL tokens, baixas taxas viabilizando microaportes).
- **Chainlink Labs:** oportunidade de integrar oracle Chainlink para validação de dados externos (ex: confirmação de geolocalização ou preço de materiais) — diferencial competitivo pós-MVP.

### ODS Contempladas
- **ODS 11 — Cidades e Comunidades Sustentáveis:** revitalização de espaços urbanos degradados, aumento da coesão comunitária.
- **ODS 13 — Ação Contra a Mudança Global do Clima:** uso de tinta fotocatalítica com dados de absorção de CO₂ registrados publicamente on-chain.

---

## 14. Glossário

| Termo | Definição |
|-------|-----------|
| RWA | Real World Asset — ativo do mundo físico representado digitalmente na blockchain |
| Escrow | Contrato inteligente que retém fundos até condições predefinidas serem cumpridas |
| Mintagem | Processo de criação de um token ou NFT na blockchain |
| Metaplex | Padrão de metadados para NFTs e tokens na Solana |
| USDC | Stablecoin lastreada em dólar americano, disponível como SPL Token na Solana |
| PYUSD | PayPal USD, stablecoin da PayPal disponível na Solana |
| Proof of Impact | Comprovação pública e imutável on-chain do impacto gerado por um projeto |
| ODS | Objetivos de Desenvolvimento Sustentável da ONU |
| QR Code | Código de resposta rápida que vincula o mural físico à sua representação digital |

---

*Documento criado para o Hackanation 2026 — TokenNation × Solana × Chainlink Labs.*  
*Período do hackathon: 24 de abril a 2 de junho de 2026.*
