# Tasks: Buscador de produtos em alta por categoria (EDI-130)

**Input**: `specs/033-buscador-produtos-alta/` (plan, spec, research, data-model, contracts/produtos-alta.md)
**Tests**: incluídos (o plano define `.test.ts` para funções puras, clientes e rotas — padrão do projeto, Vitest)

## Phase 1: Setup

- [X] T001 Criar tipos `ItemEmAlta`, `OrigemItem`, `CategoriaNavegavel` e `ListaEmAlta` (data-model.md) em `lib/models/produtosAlta.ts`; adicionar `foto?: string` em `ItemRankingCategoria` em `lib/models/trendCache.ts`

## Phase 2: Foundational

- [X] T002 [P] Montar links (research #2/#8): `linkMercadoLivre(tipo, id | termo)`, `linkShopee(nome)`, `linkMakerWorld(nome)`, `slugBuscaMl(termo)` em `lib/produtosAlta/links.ts` + testes (acentos, `ITEM` MLB123 → `MLB-123`, `USER_PRODUCT` → `/up/`, sem nome → undefined) em `lib/produtosAlta/links.test.ts`
- [X] T003 [P] Resposta de erro `respostaDeErroProdutosAlta` (400/401/429/502 com `statusOrigem`, padrão `lib/nichos/erros.ts`) em `lib/produtosAlta/erros.ts` + `lib/produtosAlta/erros.test.ts`
- [X] T004 Clientes ML em `lib/estoque/canais/mercadoLivre/tendencias.ts`: `buscarMaisVendidosCategoria` passa a trazer `foto` (de `pictures[0].url`); novas `buscarProdutosCatalogo(termo, { limite, dominioId? })` → `{ id, nome, foto, dominioId }[]`, `descobrirDominios(termo)` → `{ dominioId, categoriaId }[]`, `obterCategoriaNavegavel(id)` → `{ id, nome, caminho, filhas }`; atualizar `lib/estoque/canais/mercadoLivre/tendencias.test.ts`
- [X] T005 Validação de categoria (uma das 16 de `CATEGORIAS_NICHO` ou descendente pelo `caminho`) e cache de 7 dias de categoria (`alta:categoria:<id>`) e de produto (`alta:produto:<id>`) via `obterComCache({ ttlMs })` em `lib/produtosAlta/categorias.ts` + `lib/produtosAlta/categorias.test.ts`

## Phase 3: User Story 1 — Mais vendidos de uma categoria (P1) 🎯 MVP

**Independent Test**: Banheiros › … › Suportes para Papel Higiênico + "Mais vendidos" → cards 1º, 2º… com foto e nome.

- [X] T006 [US1] `listarMaisVendidos(categoriaId, { forcar })` em `lib/produtosAlta/listas.ts`: highlights → `ItemEmAlta[]` (nome/foto do cache de produto, falha de um produto = card substituto), cache 24h `alta:vendidos:<id>`, concorrência 4; testes com dependências injetadas em `lib/produtosAlta/listas.test.ts`
- [X] T007 [US1] Rota `GET /api/admin/produtos-alta/lista` (`categoria`, `ordem`, `forcar`; 400 `categoria_invalida`/`ordem_invalida`) em `app/api/admin/produtos-alta/lista/route.ts` + `route.test.ts`
- [X] T008 [US1] Rota `GET /api/admin/produtos-alta/categoria` (`CategoriaNavegavel`) em `app/api/admin/produtos-alta/categoria/route.ts` + `route.test.ts`
- [X] T009 [P] [US1] Mesclar "Todas" (intercalar por posição, tirar repetidos pela `chave` ficando a melhor posição) em `lib/produtosAlta/mesclar.ts` + `lib/produtosAlta/mesclar.test.ts`
- [X] T010 [US1] Invocar skill `frontend-design` e criar `components/admin/ProdutosAlta.tsx` + `components/admin/produtosAlta.module.css`: cabeçalho "O que está em alta agora", filtro de categoria (16 agrupadas + "Todas"), chips de subcategoria e caminho clicável (FR-013), ordenação, contador, grade responsiva de cards (foto/substituta, nome, selo de posição, categoria), "obtido às HH:MM" + Atualizar, aviso discreto de que preço/vendas não são liberados pelo ML (FR-009), "Todas" com até 4 requisições paralelas e carregamento progressivo + aviso de categorias que falharam; erros mostram `mensagem` da API
- [X] T011 [US1] Trocar `app/admin/(painel)/tendencias/page.tsx` para renderizar `ProdutosAlta` e o menu para "Produtos em alta" em `app/admin/(painel)/layout.tsx`

## Phase 4: User Story 2 — Mais procurados (P1)

**Independent Test**: Organização para Casa + "Mais procurados" → cards com termo, posição e foto.

- [X] T012 [US2] `listarMaisProcurados(categoriaId, { forcar })` em `lib/produtosAlta/listas.ts`: 20 primeiros termos de `buscarTendenciasCategoria` + foto/nome do 1º produto de catálogo do termo, cache 24h `alta:procurados:<id>`; testes em `lib/produtosAlta/listas.test.ts`
- [X] T013 [US2] Rota `lista` aceita `ordem=procurados` em `app/api/admin/produtos-alta/lista/route.ts` (+ caso no `route.test.ts`); selo "Nº mais buscado" e termo no card em `components/admin/ProdutosAlta.tsx`

## Phase 5: User Story 3 — Abrir nas lojas e no MakerWorld (P1)

**Independent Test**: os 3 ícones de um card abrem ML, Shopee e MakerWorld em nova aba com o nome certo.

- [X] T014 [US3] Ícones "Ver no Mercado Livre", "Buscar na Shopee", "Buscar no MakerWorld" (`target="_blank" rel="noopener noreferrer"`, `aria-label`, desativados com dica quando sem nome) em `components/admin/ProdutosAlta.tsx`

## Phase 6: User Story 4 — Pesquisar por nome (P2)

**Independent Test**: "papel higiênico" com "Todas" e depois dentro de Banheiros → resultados diferentes; termo sem sentido → mensagem de vazio.

- [X] T015 [US4] `buscarPorNome(termo, categoriaId?, { forcar })` em `lib/produtosAlta/listas.ts`: sem categoria → `buscarProdutosCatalogo(termo, 24)`; com categoria → `descobrirDominios` + filtro por descendência + `buscarProdutosCatalogo` por domínio (repartindo 24), cache `alta:busca:<cat|todas>:<termo normalizado>`; testes em `lib/produtosAlta/listas.test.ts`
- [X] T016 [US4] Rota `GET /api/admin/produtos-alta/busca` (400 `termo_invalido`) em `app/api/admin/produtos-alta/busca/route.ts` + `route.test.ts`
- [X] T017 [US4] Campo de busca (Enter/botão, vazio volta à listagem), mensagem de nenhum resultado com sugestão de limpar categoria e botão "Limpar filtros" em `components/admin/ProdutosAlta.tsx`

## Phase 7: User Story 5 — Resultado guardado 24h (P3)

- [X] T018 [US5] Conferir `origem`/`obtidoEm`/`avisoDesatualizado` nas 3 rotas e exibir aviso de dado desatualizado em `components/admin/ProdutosAlta.tsx`

## Phase 8: Polish

- [X] T019 Remover tela/rotas antigas sem uso: `components/admin/TendenciasBusca.tsx`, `app/api/admin/tendencias/route.ts` (+ test), `app/api/admin/tendencias/gerais/route.ts` (+ test), `buscarTendenciasGerais`/`preverCategoriaParaTendencia` e tipos `TrendCacheBusca`/`TrendCacheGerais` se sem referência (`lib/estoque/canais/mercadoLivre/tendencias.ts`, `lib/models/trendCache.ts`)
- [X] T020 Rodar `npx vitest run`, `npx tsc --noEmit` e `npm run lint`; corrigir falhas

## Dependencies

Setup → Foundational → US1 (MVP) → US2, US3, US4 (independentes entre si, mesmo componente) → US5 → Polish.

## Parallel

- T002, T003 em paralelo; T009 em paralelo com T006–T008.

## Implementation Strategy

MVP = US1 (mais vendidos com subcategorias). Depois US2 e US3 (completam o P1), US4, US5 e limpeza.
