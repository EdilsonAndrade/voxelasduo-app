# Implementation Plan: Publicar produtos no Facebook e Instagram Shop via catálogo da Meta

**Branch**: `edilsonaandrade/edi-109-publicar-produtos-no-facebook-e-instagram-shop-via-catalogo` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/022-meta-catalogo-facebook/spec.md` (Linear EDI-109)

## Summary

O site passa a servir um **feed CSV público** (`GET /api/feeds/meta`) no formato do catálogo da Meta, com os produtos marcados para o Facebook/Instagram. O vendedor cadastra essa URL uma única vez como "feed programado" no catálogo `1247757684199959`, e a Meta sincroniza sozinha. No admin, cada produto ganha, em "Canais de venda", a opção "Publicar no Facebook/Instagram" e textos chamativos próprios (título/descrição opcionais, com fallback para os do site); a listagem ganha o selo "Facebook". Preço enviado = preço do site (checkout no site).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19
**Primary Dependencies**: Next.js, MongoDB driver — nenhuma dependência nova (CSV gerado por função pura)
**Storage**: MongoDB — sem coleção nova; campo aditivo `produtos.metaCatalogo` (ausente = não publicado, sem migração)
**Testing**: Vitest (`environment: "node"`) — gerador do feed (função pura), validação, rota do feed e rotas de produto. UI verificada manualmente via Test Guide.
**Target Platform**: Web (Next.js na Vercel)
**Project Type**: web-service (aplicação Next.js full-stack existente)
**Performance Goals**: Feed gerado em poucos segundos para o catálogo inteiro (dezenas/centenas de produtos) — uma consulta ao Mongo + montagem em memória
**Constraints**: Feed nunca vazio em caso de falha (500, FR-010); links e fotos absolutos no domínio público (`SITE_URL`, não `VERCEL_URL`); limites Meta: título 200, descrição 9.999, até 20 fotos adicionais
**Scale/Scope**: Loja pequena, um administrador

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` está com o template de exemplo — nenhum gate além das convenções já seguidas: lógica pura em `lib/` com testes, schema aditivo e opcional, sem dependência nova.

**Erros visíveis na aba Network (regra 3 do CLAUDE.md)**: o feed responde 500 com JSON em falha (nunca 200 vazio); validação do produto responde 400 com `campos.metaCatalogo`.

**i18n (regra 9 do CLAUDE.md)**: sem biblioteca de i18n no projeto; textos novos inline em pt-BR, seguindo o padrão existente (research.md #8).

Re-check pós-design: nenhuma violação.

## Project Structure

### Documentation (this feature)

```text
specs/022-meta-catalogo-facebook/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── feed-meta.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
lib/models/produto.ts                          # alterado: MetaCatalogoProduto, Produto.metaCatalogo?
lib/site/url.ts                                # novo: urlBaseSite(), urlAbsoluta(caminho)
lib/email/templates.ts                         # alterado: usa urlBaseSite()

lib/produtos/feedMeta.ts                       # novo: montarItemFeedMeta(produto, base), gerarCsvFeedMeta(produtos, base)
lib/produtos/feedMeta.test.ts                  # novo
lib/produtos/validation.ts (+ .test.ts)        # alterado: valida metaCatalogo
lib/produtos/repository.ts                     # alterado: listarProdutosPublicadosMeta()
lib/produtos/produtoFormulario.ts (+ .test.ts) # alterado: metaPublicar/metaTitulo/metaDescricao; duplicar zera publicar

app/api/feeds/meta/route.ts (+ .test.ts)       # novo: GET público, text/csv, 500 em falha
app/api/produtos/route.ts                      # alterado: persiste metaCatalogo no POST
app/api/produtos/[id]/route.ts (+ .test.ts)    # sem mudança de lógica (spread do payload já persiste); teste cobre metaCatalogo

components/admin/ProdutoForm.tsx               # alterado: card "Facebook/Instagram" em Canais de venda (toggle, título c/ contador, descrição)
app/admin/(painel)/produtos/page.tsx           # alterado: selo "Facebook"
components/admin/admin.module.css              # alterado: classe do selo Facebook (se necessário)
```

**Structure Decision**: sem estrutura nova além de `lib/site/` (helper de URL compartilhado) e `app/api/feeds/` (rota pública, fora do matcher de autenticação). Segue o padrão de funções puras em `lib/produtos/` já usado em `canais.ts`/`precificacao.ts`.

## Complexity Tracking

Nenhuma violação a justificar.
