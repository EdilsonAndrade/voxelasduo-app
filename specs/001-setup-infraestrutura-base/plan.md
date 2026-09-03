# Implementation Plan: Setup do Projeto e Infraestrutura Base

**Branch**: `edilsonaandrade/edi-74-tarefa-1-setup-do-projeto-e-infraestrutura-base` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-setup-infraestrutura-base/spec.md` (Linear EDI-74)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Criar a base técnica do e-commerce de produtos 3D: um projeto Next.js (App Router) publicado continuamente na Vercel, conectado a um cluster MongoDB Atlas (tier gratuito) via variáveis de ambiente, com as coleções iniciais `produtos` e `pedidos` modeladas, e uma estrutura de pastas de API Routes (`/api/produtos`, `/api/pedidos`, `/api/webhooks`, mais um health-check de banco) pronta para as próximas 8 tarefas do épico EDI-73.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20 LTS (runtime da Vercel)
**Primary Dependencies**: Next.js 14+ (App Router), driver oficial `mongodb` (Node.js Driver) para acesso ao MongoDB Atlas
**Storage**: MongoDB Atlas, cluster tier gratuito (M0) — fonte única de verdade para produtos e pedidos
**Testing**: `tsc --noEmit` (checagem de tipos) e `next build` como verificação estática/build nesta tarefa; testes automatizados de domínio (unit/integration) ficam a cargo das tarefas de catálogo/checkout/pagamento, que já terão regras de negócio para testar
**Target Platform**: Web — Vercel (Serverless/Edge Functions do Next.js)
**Project Type**: Aplicação web full-stack única (frontend + API Routes no mesmo projeto Next.js, sem backend separado)
**Performance Goals**: Não há meta de performance específica nesta tarefa de infraestrutura; a única expectativa é que o deploy conclua e o app fique acessível dentro do tempo padrão da Vercel
**Constraints**: Sem backend separado em Node.js/Python (tudo via API Routes do Next.js); nenhuma credencial de banco versionada no repositório; uso do tier gratuito do MongoDB Atlas (limites de conexões simultâneas e armazenamento do M0)
**Scale/Scope**: Escopo inicial pequeno (catálogo de um projeto pessoal/familiar, poucas dezenas de produtos) — a modelagem deve deixar espaço para os campos que as tarefas futuras (sincronização com Shopee/Mercado Livre, pagamento) vão adicionar, sem exigir migração complexa

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` ainda está no estado de template padrão (placeholders `[PRINCIPLE_1_NAME]` etc.), ou seja, este projeto não tem uma constituição própria ratificada ainda. Não há, portanto, gates formais a validar nesta fase — nenhuma violação identificada. Recomendação: rodar `/speckit-constitution` em algum momento para formalizar princípios do projeto (ex.: MongoDB como fonte única de verdade, sem backend separado), mas isso não bloqueia esta tarefa.

## Project Structure

### Documentation (this feature)

```text
specs/001-setup-infraestrutura-base/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx
├── page.tsx
├── globals.css
└── api/
    ├── health/
    │   └── route.ts        # verifica conexão com o MongoDB Atlas
    ├── produtos/
    │   └── route.ts        # base para CRUD de produtos (Tarefa 2)
    ├── pedidos/
    │   └── route.ts        # base para criação/consulta de pedidos (Tarefa 3-5)
    └── webhooks/
        └── route.ts        # base para webhooks de pagamento/marketplaces (Tarefa 4, 6, 7)

lib/
├── db/
│   └── mongodb.ts          # cliente MongoDB singleton (reutilizado por toda a app)
└── models/
    ├── produto.ts           # tipos/schema da coleção "produtos"
    └── pedido.ts            # tipos/schema da coleção "pedidos"

.env.example                 # variáveis de ambiente documentadas (sem valores reais)
.env.local                   # (não versionado) credenciais locais de desenvolvimento
```

**Structure Decision**: Projeto Next.js único (App Router) na raiz do repositório — frontend e API Routes convivem em `app/`, sem separação `backend/`/`frontend/`, conforme decisão do épico EDI-73 de não ter backend separado. `lib/db` centraliza a conexão MongoDB para ser reutilizada por todas as rotas; `lib/models` guarda os tipos das coleções que as tarefas seguintes vão consumir.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — nenhuma violação identificada (não há constituição ratificada para o projeto ainda).
