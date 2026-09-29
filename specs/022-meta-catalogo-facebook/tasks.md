# Tasks: Publicar produtos no Facebook e Instagram Shop via catálogo da Meta

**Input**: Design documents from `specs/022-meta-catalogo-facebook/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/feed-meta.md, quickstart.md

**Tests**: incluídos para lógica pura e rotas (padrão do projeto: Vitest). UI verificada via Test Guide.

## Phase 1: Setup

- [X] T001 Criar helper `urlBaseSite()` (`process.env.SITE_URL || "https://www.voxelasduo.com.br"`, sem barra final) e `urlAbsoluta(caminhoOuUrl)` (mantém URLs `http(s)://`, prefixa a base em caminhos relativos) em lib/site/url.ts, com testes em lib/site/url.test.ts
- [X] T002 Trocar a resolução local da base em lib/email/templates.ts por `urlBaseSite()` de lib/site/url.ts (sem mudar comportamento)

## Phase 2: Foundational

- [X] T003 Adicionar `MetaCatalogoProduto` e `Produto.metaCatalogo?` em lib/models/produto.ts (data-model.md)
- [X] T004 Validar `metaCatalogo` em `validarProduto` (objeto, `publicar` boolean, `titulo` ≤ 200, `descricao` ≤ 9999; erro em `erros.metaCatalogo`) em lib/produtos/validation.ts, com casos em lib/produtos/validation.test.ts
- [X] T005 Persistir `metaCatalogo` no POST em app/api/produtos/route.ts (e `metaCatalogo` em `ProdutoPayload`)

## Phase 3: User Story 1 — Feed que a Meta importa (P1) 🎯 MVP

**Independent test**: produto com `metaCatalogo.publicar: true` aparece em `GET /api/feeds/meta` com todas as colunas; falha no banco → 500.

- [X] T006 [P] [US1] Implementar `montarItemFeedMeta(produto, base)` e `gerarCsvFeedMeta(produtos, base)` (colunas/ordem do contrato, preço `NN.NN BRL`, disponibilidade por estoque, fallback título/descrição, truncamento 200/9999, link com `encodeURIComponent`, fotos absolutas, até 20 adicionais, ignora itens sem foto, escape CSV RFC 4180) em lib/produtos/feedMeta.ts
- [X] T007 [P] [US1] Testes do gerador (fallbacks, escape de vírgula/aspas/quebra de linha/emoji, estoque 0, sem fotos, preço, truncamento, feed vazio só com cabeçalho) em lib/produtos/feedMeta.test.ts
- [X] T008 [US1] Adicionar `listarProdutosPublicadosMeta()` (`{ "metaCatalogo.publicar": true }`) em lib/produtos/repository.ts
- [X] T009 [US1] Criar `GET` público em app/api/feeds/meta/route.ts (`dynamic = "force-dynamic"`, `text/csv; charset=utf-8`, `Cache-Control: no-store`, 500 JSON em falha)
- [X] T010 [US1] Testes da rota (200 com CSV, 500 quando o repositório lança) em app/api/feeds/meta/route.test.ts

## Phase 4: User Story 2 — Marcar produtos no admin (P1)

**Independent test**: ligar a opção num produto, salvar, e ver o produto no feed; desligar e ver sumir.

- [X] T011 [US2] Adicionar `metaPublicar`, `metaTitulo`, `metaDescricao` em `ProdutoFormValores` e nos valores padrão em components/admin/ProdutoForm.tsx
- [X] T012 [US2] Mapear `metaCatalogo` ↔ formulário em `produtoParaFormulario` e zerar `metaPublicar` em `produtoParaDuplicar` em lib/produtos/produtoFormulario.ts, com testes em lib/produtos/produtoFormulario.test.ts
- [X] T013 [US2] Enviar `metaCatalogo` no payload do `handleSubmit` e adicionar o card "Facebook/Instagram" (checkbox "Publicar no Facebook/Instagram", selo Publicado/Não publicado) na seção "Canais de venda" em components/admin/ProdutoForm.tsx, exibindo `camposErro.metaCatalogo`
- [X] T014 [US2] Teste de PATCH persistindo `metaCatalogo` em app/api/produtos/[id]/route.test.ts

## Phase 5: User Story 3 — Texto chamativo (P2)

**Independent test**: título/descrição próprios aparecem no feed; em branco, volta para os do site.

- [X] T015 [US3] Adicionar no card "Facebook/Instagram" os campos "Título para o Facebook" (maxLength 200, contador) e "Descrição para o Facebook" (textarea, maxLength 9999), com dica de que em branco usa o texto do site, em components/admin/ProdutoForm.tsx

## Phase 6: User Story 4 — Selo na listagem (P3)

**Independent test**: produto marcado mostra selo "Facebook" ativo; desmarcado, selo inativo.

- [X] T016 [US4] Exibir selo "Facebook" (ativo quando `metaCatalogo?.publicar`, inativo no estilo `badgeCanalShopeeEmBreve` caso contrário) em app/admin/(painel)/produtos/page.tsx, adicionando a classe `badgeCanalFacebook` em components/admin/admin.module.css

## Phase 6b: User Story 5 — Copiar para o Marketplace (P3)

- [X] T019 [US5] Extrair `resolverTextosMeta` e criar `montarTextoMarketplace` em lib/produtos/textosMeta.ts (usado pelo feed), com testes em lib/produtos/textosMeta.test.ts
- [X] T020 [US5] Botões "Copiar título/preço/descrição" no card Facebook/Instagram em components/admin/ProdutoForm.tsx, com feedback "Copiado ✓" e erro quando o navegador bloqueia

## Phase 7: Polish

- [X] T017 Rodar `npm test` e `npx tsc --noEmit` e corrigir falhas
- [X] T018 Revisar quickstart.md (Test Guide) com a URL final do feed

## Dependencies

- T001 → T006/T009; T003 → T004, T006, T011; T004/T005 → US2
- US1 (T006–T010) independente da UI; US2 depende de T003–T005; US3 depende de T013; US4 depende de T003
- Paralelos: T006 ∥ T007; T012 ∥ T016

## Implementation Strategy

MVP = Phases 1–4 (feed + marcação no admin): já permite popular o catálogo e enviar a loja à análise. Depois US3 (texto) e US4 (selo).
