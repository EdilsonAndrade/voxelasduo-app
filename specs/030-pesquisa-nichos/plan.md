# Implementation Plan: Pesquisa de nichos para impressão em escala

**Branch**: `030-pesquisa-nichos` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/030-pesquisa-nichos/spec.md`

## Summary

Tela admin que cruza os termos mais buscados por categoria no Mercado Livre com modelos do MakerWorld de licença comercial, filtrados por 1 cor e A1, classificando potencial (posição na busca + downloads) e concorrência (produtos de catálogo do ML). Cada modelo abre no MakerWorld no perfil escolhido e pode virar um cálculo salvo na calculadora de preço. Pesquisa alternativa por nome ou link (Shopee/ML), com nome tirado do slug. Cache de 24h reaproveitando `trend_cache`.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver 6.12 — nenhuma dependência nova
**Storage**: MongoDB — `trend_cache` (existente, novas chaves `nichos:*`), `calculosPreco` (existente)
**Testing**: Vitest (funções puras + clientes com `fetchImpl` injetado + rotas com módulos mockados, padrão de `app/api/admin/tendencias/route.test.ts`)
**Target Platform**: Vercel (Fluid Compute), admin web
**Project Type**: web (Next.js monolito)
**Performance Goals**: categoria sem cache em ≤ 60 s; com cache, imediato
**Constraints**: API do ML limitada (sem busca de anúncios/preços); MakerWorld não oficial via `api.bambulab.com`; `maxDuration = 300`
**Scale/Scope**: 1 usuário admin; até 3 categorias por pesquisa; 20 termos por categoria; até 2 modelos por termo

## Constitution Check

`.specify/memory/constitution.md` ainda é o template sem princípios preenchidos — sem gates formais. Regras do `CLAUDE.md` aplicadas: erros com status real (FR-014), textos pt-BR inline, skill `frontend-design` antes da UI, sem subir servidor (Test Guide), sem commit.

## Project Structure

### Documentation (this feature)

```text
specs/030-pesquisa-nichos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/nichos.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/models/nicho.ts                         # tipos (data-model.md)
lib/nichos/categorias.ts                    # lista fixa de categorias do ML
lib/nichos/classificacao.ts (+ .test.ts)    # potencial, concorrência, escolha de perfil, licença
lib/nichos/linkProduto.ts (+ .test.ts)      # nome a partir do link da Shopee/ML
lib/nichos/makerworld.ts (+ .test.ts)       # cliente api.bambulab.com (fetchImpl injetável, ErroMakerWorld)
lib/nichos/pesquisa.ts (+ .test.ts)         # orquestra categoria/termo com concorrência limitada
lib/nichos/dependencias.ts                  # dependências reais + cache de 7 dias do detalhe do modelo
lib/nichos/calculo.ts (+ .test.ts)          # corpo do cálculo salvo a partir do modelo
lib/nichos/erros.ts, lib/nichos/filtros.ts  # resposta de erro e filtros da query
lib/estoque/canais/mercadoLivre/tendencias.ts  # + buscarTendenciasCategoria, contarProdutosCatalogo
lib/produtos/calculadoraPadrao.ts           # valoresPadrao/ANUNCIO_PADRAO (saem do componente client)
app/api/admin/nichos/categoria/route.ts (+ test)
app/api/admin/nichos/termo/route.ts (+ test)
app/admin/(painel)/nichos/page.tsx
components/admin/PesquisaNichos.tsx + pesquisaNichos.module.css
app/admin/(painel)/layout.tsx               # link no menu
components/admin/CalculadoraRapida.tsx      # passa a importar calculadoraPadrao
```

**Structure Decision**: segue o padrão já usado em tendências (EDI-107) e produção Bambu (029): lógica pura e clientes em `lib/`, rotas finas em `app/api/admin/`, componente client em `components/admin/`.

## Complexity Tracking

Sem violações.
