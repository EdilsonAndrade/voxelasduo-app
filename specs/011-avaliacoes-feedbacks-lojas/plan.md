# Implementation Plan: Importação de Avaliações e Feedbacks das Lojas Parceiras

**Branch**: `edilsonaandrade/edi-85-tarefa-11-importacao-de-avaliacoes-e-feedbacks-das-lojas` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-avaliacoes-feedbacks-lojas/spec.md`

## Summary

Importar periodicamente, via job agendado, as avaliações de produtos feitas na Shopee e no Mercado Livre, armazená-las no MongoDB associadas ao produto do site, e exibi-las reunidas (site + Shopee + Mercado Livre) em uma seção "avaliações de clientes" na página do produto. Reaproveita a autenticação OAuth2 do Mercado Livre e o padrão de client por canal já construídos nas Tarefas 5/7 (EDI-78/EDI-80); a Shopee segue como canal condicional (stub) até a aprovação do app na Shopee Open Platform, mesmo comportamento já adotado pela sincronização de estoque.

## Technical Context

**Language/Version**: TypeScript 5.7 (Next.js 16, App Router)
**Primary Dependencies**: Next.js API Routes (rota de cron e rotas REST), `mongodb` (driver oficial, sem ORM), Mercado Livre REST API (`GET /reviews/item/{item_id}`), Shopee Open Platform REST API (`GET /api/v2/product/get_comment`, condicional)
**Storage**: MongoDB Atlas — novas coleções `avaliacoes` e `avaliacoesImportacaoFalhas` (data-model.md); nenhuma mudança em `produtos`
**Testing**: Vitest (`npm test`), seguindo o padrão de teste unitário por módulo já usado em `lib/estoque/*.test.ts`
**Target Platform**: Vercel (Fluid Compute / Node.js runtime), cron via `vercel.ts`
**Project Type**: Web app single-repo (Next.js App Router, frontend + API routes no mesmo projeto)
**Performance Goals**: Importação diária de avaliações de todo o catálogo com produto vendido em canal externo (escala da loja: dezenas a poucas centenas de produtos) — sem meta de latência de usuário, é um job em background
**Constraints**: Plano Hobby da Vercel — cron só roda 1x/dia (mesma limitação já documentada em `vercel.ts` para o cron de estoque); Shopee indisponível até aprovação externa do app (research.md #2)
**Scale/Scope**: Catálogo atual da loja (não é um marketplace de alto volume) — paginação da seção de avaliações (FR-011) é sobre número de avaliações por produto, não sobre número de produtos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` ainda é o template padrão do Spec Kit (sem princípios preenchidos para este projeto) — não há gates formais a verificar. Nenhuma violação a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/011-avaliacoes-feedbacks-lojas/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/
│   └── avaliacoes-api.md # Fase 1
└── tasks.md               # Fase 2 (/speckit.tasks — não criado por este comando)
```

### Source Code (repository root)

Projeto único (Next.js App Router) — sem separação frontend/backend, seguindo a estrutura já existente do repositório.

```text
lib/
├── models/
│   ├── avaliacao.ts                    # novo — Avaliação, AVALIACOES_COLLECTION
│   └── avaliacaoImportacaoFalha.ts     # novo — FalhaImportacaoAvaliacao
├── avaliacoes/                          # novo módulo, paralelo a lib/estoque/
│   ├── importacao.ts                   # importarAvaliacoesProduto (contracts/avaliacoes-api.md)
│   ├── importacao.test.ts
│   ├── repository.ts                   # buscarAvaliacoesProduto (paginada), listarFalhasPendentes
│   ├── repository.test.ts
│   └── canais/
│       ├── mercadoLivre.ts             # busca GET /reviews/item/{id}, reaproveita auth.ts existente
│       ├── mercadoLivre.test.ts
│       ├── shopee.ts                   # stub condicional, mesmo padrão de lib/estoque/canais/shopee.ts
│       └── shopee.test.ts

app/
├── api/
│   ├── avaliacoes/
│   │   ├── importar/route.ts           # novo — GET/POST, cron
│   │   ├── importar/route.test.ts
│   │   ├── pendencias/route.ts         # novo — GET
│   │   └── pendencias/route.test.ts
│   └── produtos/[id]/
│       └── avaliacoes/route.ts         # novo — GET paginado
├── produtos/[categoria]/[slug]/
│   └── page.tsx                        # alterado — inclui <AvaliacoesProduto>

components/
└── produtos/
    ├── AvaliacoesProduto.tsx           # novo — server: primeira página; client: "carregar mais"
    └── produtos.module.css             # alterado — estilos da nova seção

vercel.ts                                # alterado — segunda entrada em crons
```

**Structure Decision**: Segue a organização já estabelecida pelo módulo `lib/estoque/` (Tarefas 5/7) — um módulo de domínio (`lib/avaliacoes/`) com sub-diretório `canais/` para os clients específicos de cada canal externo, modelos em `lib/models/`, e rotas finas em `app/api/` que só orquestram as funções de `lib/`. Nenhuma nova camada arquitetural é introduzida; a única extensão de infraestrutura é o segundo cron em `vercel.ts`.

## Complexity Tracking

*Sem violações de constituição a justificar (ver Constitution Check acima).*
