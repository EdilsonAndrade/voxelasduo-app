# Implementation Plan: Buscador de produtos em alta por categoria

**Branch**: `edilsonaandrade/edi-130-buscador-de-produtos-em-alta-por-categoria-mais-vendidos-e` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/033-buscador-produtos-alta/spec.md`

## Summary

A tela `/admin/tendencias` vira "Produtos em alta": grade de cards (foto, nome, posição, categoria) com os mais vendidos (`/highlights` + `/products/{id}`) ou os mais procurados (`/trends` + 1º produto de catálogo do termo) das 16 categorias 3D — com descida para subcategorias, onde está o que é imprimível — e busca por nome no catálogo, restrita à categoria via `domain_discovery` + `domain_id`. Cada card abre o item no ML e busca o nome na Shopee e no MakerWorld. Cache 24h (listas) e 7 dias (nome/foto, categorias) em `trend_cache`.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver — nenhuma dependência nova
**Storage**: MongoDB `trend_cache` (existente, chaves `alta:*`)
**Testing**: Vitest — funções puras, clientes com `fetchImpl` injetado, rotas com módulos mockados (padrão de `app/api/admin/nichos/*/route.test.ts`)
**Target Platform**: Vercel (Fluid Compute), admin web
**Project Type**: web (Next.js monolito)
**Performance Goals**: categoria com cache < 1 s; sem cache ≤ 10 s; "Todas" ≤ 30 s (carregamento progressivo)
**Constraints**: ML sem preço/vendas/visitas de terceiros; `ITEM`/`USER_PRODUCT` 403; `products/search` ignora `category`; concorrência interna de 4 chamadas; `maxDuration = 60`
**Scale/Scope**: 1 admin; 16 categorias + subcategorias; 20 itens por lista; 24 por busca

## Constitution Check

`.specify/memory/constitution.md` ainda é o template sem princípios — sem gates formais. Regras do `CLAUDE.md`: erros com status real na aba Network (research #10), textos pt-BR inline (sem lib de i18n no projeto, research #11), skill `frontend-design` antes da UI, sem subir servidor (Test Guide), sem commit. ✅ Reavaliado após o design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/033-buscador-produtos-alta/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/produtos-alta.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/models/produtosAlta.ts                    # ItemEmAlta, CategoriaNavegavel
lib/models/trendCache.ts                      # ItemRankingCategoria.foto; remove tipos de "gerais"/"busca" se sem uso
lib/produtosAlta/links.ts (+ .test.ts)        # links ML/Shopee/MakerWorld (research #2/#8)
lib/produtosAlta/mesclar.ts (+ .test.ts)      # intercalar por posição + tirar repetidos ("Todas")
lib/produtosAlta/categorias.ts (+ .test.ts)   # validar categoria (16 ou descendente), caminho/filhas
lib/produtosAlta/listas.ts (+ .test.ts)       # vendidos/procurados/busca com concorrência 4 e cache
lib/produtosAlta/erros.ts (+ .test.ts)        # resposta de erro (padrão lib/nichos/erros.ts + 429)
lib/estoque/canais/mercadoLivre/tendencias.ts # + foto no ranking, buscarProdutosCatalogo, descobrirDominios, obterCategoriaNavegavel; remove buscarTendenciasGerais/preverCategoriaParaTendencia
app/api/admin/produtos-alta/lista/route.ts (+ test)
app/api/admin/produtos-alta/busca/route.ts (+ test)
app/api/admin/produtos-alta/categoria/route.ts (+ test)
app/admin/(painel)/tendencias/page.tsx        # passa a renderizar ProdutosAlta
components/admin/ProdutosAlta.tsx + produtosAlta.module.css
app/admin/(painel)/layout.tsx                 # menu "Produtos em alta"
removidos: components/admin/TendenciasBusca.tsx, app/api/admin/tendencias/** (+ testes)
```

**Structure Decision**: mesmo padrão de specs/020 e 030 — lógica pura e clientes em `lib/`, rotas finas em `app/api/admin/`, componente client em `components/admin/`.

## Complexity Tracking

Sem violações.
