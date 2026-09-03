# Implementation Plan: Catálogo de Produtos (CRUD)

**Branch**: `edilsonaandrade/edi-75-tarefa-2-catalogo-de-produtos-crud` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-catalogo-produtos/spec.md` (Linear EDI-75)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implementar o CRUD completo de produtos sobre a infraestrutura já criada na Tarefa 1 (EDI-74): API Routes para criar/listar/buscar/atualizar/remover produtos, upload de fotos via Vercel Blob, páginas públicas de listagem (com busca e filtro por categoria) e de detalhe do produto, e uma área administrativa simples (sem autenticação nesta tarefa, conforme decisão registrada no spec) para cadastrar, editar e remover produtos.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 20 LTS (runtime da Vercel) — mesma base da Tarefa 1
**Primary Dependencies**: Next.js 16 (App Router, já no projeto), driver oficial `mongodb` 6.x (já no projeto), `@vercel/blob` (novo — upload/armazenamento de fotos de produto, com suporte a acesso público para exibição no site)
**Storage**: MongoDB Atlas — coleção `produtos` (já modelada em `lib/models/produto.ts`, estendida com `slug` nesta tarefa) — e Vercel Blob para os arquivos de imagem (o produto guarda apenas as URLs retornadas pelo Blob)
**Testing**: Nenhum framework de testes está configurado ainda no projeto. Esta tarefa introduz **Vitest** para testes unitários das regras de negócio que passam a existir (validação de produto, montagem de filtro/busca, geração de slug), complementando `tsc --noEmit` e `next build` como verificação estática/build
**Target Platform**: Web — Vercel (Serverless Functions do Next.js)
**Project Type**: Aplicação web full-stack única (frontend + API Routes no mesmo projeto Next.js, sem backend separado) — mesma estrutura da Tarefa 1
**Performance Goals**: Catálogo pequeno (dezenas de produtos) — sem exigência de paginação sofisticada; busca e filtro devem retornar resultados de forma percebida como instantânea (alinhado a SC-003 do spec)
**Constraints**: Sem backend separado; **sem autenticação na área `/admin` nesta tarefa** (decisão registrada no spec — FR-014 — dependente de EDI-81); nenhuma credencial versionada; uso do tier gratuito do MongoDB Atlas (M0) e do tier gratuito do Vercel Blob; projeto multi-idioma (I18N) — ver nota em Research sobre o estado atual do projeto
**Scale/Scope**: Dezenas de produtos, múltiplas fotos por produto (assumido limite prático de até 8 fotos/produto)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua no estado de template padrão (placeholders `[PRINCIPLE_1_NAME]` etc.) — sem constituição própria ratificada, como já registrado no plano da Tarefa 1. Não há gates formais a validar nesta fase — nenhuma violação identificada. Recomendação mantida: rodar `/speckit-constitution` em algum momento.

## Project Structure

### Documentation (this feature)

```text
specs/002-catalogo-produtos/
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
├── produtos/
│   ├── page.tsx                    # Listagem pública + busca (?q=) e filtro (?categoria=)
│   └── [categoria]/
│       ├── page.tsx                 # Listagem filtrada por categoria (URL própria, SEO)
│       └── [slug]/
│           └── page.tsx             # Detalhe do produto; not-found se inexistente/removido
├── admin/
│   └── produtos/
│       ├── page.tsx                 # Listagem administrativa (todos os produtos, inclusive sem estoque)
│       ├── novo/
│       │   └── page.tsx             # Formulário de criação (nome, descrição, preço, estoque, categoria, fotos)
│       └── [id]/
│           └── editar/
│               └── page.tsx         # Formulário de edição + remoção de produto
└── api/
    └── produtos/
        ├── route.ts                 # GET (lista com busca/filtro), POST (cria) — substitui o esqueleto da Tarefa 1
        ├── [id]/
        │   └── route.ts             # GET (por id), PATCH (atualiza), DELETE (remove)
        └── upload/
            └── route.ts             # POST — recebe arquivo de imagem, envia ao Vercel Blob, retorna URL

lib/
├── db/
│   └── mongodb.ts                   # já existe (Tarefa 1) — reutilizado sem alteração
├── models/
│   └── produto.ts                   # já existe — adiciona campo `slug`
├── produtos/
│   ├── repository.ts                # acesso a dados: listar (com busca/filtro), buscar por id/slug, criar, atualizar, remover
│   ├── validation.ts                # validação de payload (campos obrigatórios, preço > 0, estoque >= 0, fotos)
│   └── slug.ts                      # geração/normalização de slug a partir do nome do produto
└── storage/
    └── blob.ts                      # wrapper de upload/remoção de imagem via @vercel/blob

.env.example                          # adiciona BLOB_READ_WRITE_TOKEN (documentado, sem valor real)
```

**Structure Decision**: Mantém o projeto Next.js único definido na Tarefa 1 (sem `backend/`/`frontend/` separados). As rotas públicas (`app/produtos/...`) e administrativas (`app/admin/produtos/...`) seguem exatamente a hierarquia já definida em `specs/site-architecture.md`. `lib/produtos/` concentra a lógica de domínio (validação, acesso a dados, slug) para ser reutilizada tanto pelas API Routes quanto, se necessário, por Server Actions/Server Components — mantendo as rotas de API como camada fina.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — nenhuma violação identificada (não há constituição ratificada para o projeto ainda).
