# Implementation Plan: Descoberta de tendências via Mercado Livre

**Branch**: `edilsonaandrade/edi-107-descoberta-de-tendencias-via-mercado-livre-o-que-ja-vende` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/020-ml-descoberta-tendencias/spec.md` (Linear EDI-107)

## Summary

Nova tela no admin (`/admin/tendencias`) onde o vendedor digita um termo e vê o ranking de mais vendido da categoria do Mercado Livre correspondente (posição + nome, quando resolvível), mais uma lista de tendências gerais do site. Preço e link de anúncio concorrente foram investigados e confirmados **inacessíveis** com o nível de acesso deste app (research.md #1/#3) — a tela avisa isso explicitamente em vez de simular o dado. Resultados são cacheados no MongoDB (`trend_cache`, TTL 24h) por termo normalizado, com fallback para o cache vencido em caso de falha do Mercado Livre e erro transparente (status real) quando não há cache. Reaproveita a autenticação já existente do app com o Mercado Livre (`lib/estoque/canais/mercadoLivre/auth.ts`) e o previsor de categorias já usado no cadastro de produto (`previsorCategoria.ts`).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19
**Primary Dependencies**: Next.js, MongoDB driver (`mongodb`) — nenhuma dependência nova
**Storage**: MongoDB — coleção nova `trend_cache` (documento por termo normalizado, ou `_id: "__gerais__"` para tendências gerais; ver data-model.md). Sem alteração em coleções/modelos existentes.
**Testing**: Vitest (`environment: "node"`) — funções puras e de integração mockada em `lib/estoque/canais/mercadoLivre/tendencias.ts` e nas rotas `app/api/admin/tendencias/*`. UI verificada manualmente via Test Guide (mesmo padrão já aceito em EDI-92/EDI-98/EDI-106 — sem `jsdom`).
**Target Platform**: Web (admin do site, Next.js na Vercel)
**Project Type**: web-service (aplicação Next.js full-stack existente)
**Performance Goals**: Busca nova em até 5s (SC-001); busca em cache em até 1s, sem chamar o Mercado Livre (SC-002)
**Constraints**: Sem preço/link de anúncio de terceiro — confirmado inacessível via API oficial com o token deste app, mesmo para um `ITEM_ID` real (research.md #1/#3); sem paginação avançada (ranking do `/highlights` já é limitado a ~20 posições)
**Scale/Scope**: Loja pequena, um administrador; volume de buscas baixo (uso interno antes de imprimir)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` está com o template de exemplo, sem princípios preenchidos — nenhum gate adicional além das convenções já seguidas: lógica de integração externa isolada em `lib/estoque/canais/mercadoLivre/`, com testes; nenhuma dependência nova; coleção nova sem migração (feature aditiva e independente).

**Erros visíveis na aba Network (regra 3 do CLAUDE.md)**: toda resposta de erro da rota devolve o status HTTP real do Mercado Livre (ou 401/404/400 conforme a causa) — nunca convertida em 200 (contracts/tendencias.md).

**i18n (regra 9 do CLAUDE.md)**: sem biblioteca/dicionário de i18n no projeto (confirmado em specs/019); textos novos inline em pt-BR, seguindo o padrão existente do admin.

Re-check pós-design: nenhuma violação. A limitação de preço/link é uma restrição da API externa, documentada na spec e comunicada na UI — não uma simplificação de implementação.

## Project Structure

### Documentation (this feature)

```text
specs/020-ml-descoberta-tendencias/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── tendencias.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

Aplicação Next.js única já existente:

```text
lib/models/trendCache.ts                                   # novo: TrendCacheDocumento (busca + gerais)

lib/estoque/canais/mercadoLivre/tendencias.ts               # novo: preverCategoriaParaTendencia, buscarMaisVendidosCategoria, buscarTendenciasGerais
lib/estoque/canais/mercadoLivre/tendencias.test.ts           # novo

lib/tendencias/cache.ts                                     # novo: obterComCache (TTL 24h + fallback vencido, compartilhado entre termo e gerais)
lib/tendencias/cache.test.ts                                 # novo

app/api/admin/tendencias/route.ts (+ .test.ts)               # novo: GET busca por termo
app/api/admin/tendencias/gerais/route.ts (+ .test.ts)        # novo: GET tendências gerais

app/admin/(painel)/tendencias/page.tsx                        # novo: tela
components/admin/TendenciasBusca.tsx                          # novo: campo de busca + ranking + tendências gerais
app/admin/(painel)/layout.tsx                                  # alterado: link "Tendências (ML)"
```

**Structure Decision**: sem estrutura nova — segue exatamente o padrão de `lib/configuracoes/` (EDI-106) e `lib/estoque/canais/mercadoLivre/` já existentes. `lib/tendencias/cache.ts` isola a mecânica de TTL/fallback (research.md #5) para ser reaproveitada pelos dois endpoints (busca por termo e tendências gerais) sem duplicar a lógica.
