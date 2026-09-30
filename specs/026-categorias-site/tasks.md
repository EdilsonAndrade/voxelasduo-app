# Tasks: Cadastro de categorias do site (EDI-123)

**Input**: `specs/026-categorias-site/` (plan.md, spec.md, research.md, data-model.md, contracts/categorias-api.md, quickstart.md)
**Tests**: Vitest para a lógica pura, o repositório e as rotas (padrão do projeto). UI coberta pelo Test Guide.

## Phase 1: Setup

- [X] T001 Invocar a skill `frontend-design` para definir a direção visual da tela `/admin/categorias` e do `SelectBusca`, reaproveitando os tokens de `components/admin/admin.module.css`
- [X] T002 [P] Criar os tipos, a constante da coleção e a lista `CATEGORIAS_INICIAIS` (Organizadores, Acessórios, Decoração, Presentes, Religioso, Diversos, com `padrao`) em `lib/models/categoria.ts`
- [X] T003 [P] Criar os tipos e a constante da coleção `redirecionamentosProdutos` em `lib/models/redirecionamentoProduto.ts`

## Phase 2: Foundational (bloqueia todas as histórias)

- [X] T004 [P] Validação pura de nome (trim, 1–60 caracteres, `gerarSlug` não vazio) e `nomesEquivalentes` em `lib/categorias/validation.ts`, com testes em `lib/categorias/validation.test.ts`
- [X] T005 Repositório em `lib/categorias/repository.ts`: `colecaoCategorias` (índices únicos `slug` e índice `aliases`), `garantirCategoriaPadrao` (upsert Diversos), `listarCategoriasCadastradas`, `buscarCategoriaPorSlug`, `buscarCategoriaPorAlias`, `mapaNomesCategorias` (slug→nome), `slugCategoriaValido`; testes em `lib/categorias/repository.test.ts`
- [X] T006 Redirecionamentos em `lib/categorias/redirecionamentos.ts`: `registrarRedirecionamentoProduto({categoria, slug}, produtoId)` (upsert, ignora igual), `resolverRedirecionamentoProduto(categoria, slug)` → URL atual ou null, `removerRedirecionamentosDoProduto(produtoId)`, `resolverRedirecionamentoCategoria(segmento)` (alias ou `gerarSlug` equivalente) → slug ou null; testes em `lib/categorias/redirecionamentos.test.ts`
- [X] T007 Em `lib/produtos/repository.ts`: `slugLivreNaCategoria(categoria, slugBase, ignorarId?)` (sufixo `-<base36>` como hoje) e `moverProdutoDeCategoria(id, novaCategoria)`, que resolve o conflito de slug, grava o redirecionamento e retorna o produto; `removerProduto` passa a chamar `removerRedirecionamentosDoProduto`

**Checkpoint**: base de categorias e redirecionamentos disponível.

## Phase 3: US1: Vitrine sem categorias duplicadas (P1) 🎯 MVP

**Goal**: migrar os textos livres para os slugs e exibir os filtros a partir da tabela.
**Independent Test**: rodar a migração e conferir que `/produtos` mostra "Acessórios" uma única vez e que `/produtos/acessórios` redireciona.

- [X] T008 [P] [US1] Plano de migração puro `planejarMigracao(valoresDistintos, categorias)` → `{deParaSlug, aliasesPorSlug}` e aplicação `aplicarMigracao(db, {dryRun})` (upsert do seed, update dos produtos com conflito de slug `-2`/`-3`, redirecionamentos, aliases, relatório) em `lib/categorias/migracao.ts`; testes do plano puro e da idempotência em `lib/categorias/migracao.test.ts`
- [X] T009 [US1] Script `scripts/migrar-categorias.ts` (dotenv `.env.local`, flag `--dry-run`, imprime o relatório e fecha a conexão) e `"migrar:categorias": "tsx scripts/migrar-categorias.ts"` em `package.json`
- [X] T010 [US1] Em `lib/produtos/repository.ts`, `listarCategorias()` passa a retornar `Array<{slug, nome}>` das categorias cadastradas com ≥ 1 produto, por `ordem`
- [X] T011 [P] [US1] `app/produtos/page.tsx`: chips usam `c.slug` no link e `c.nome` no texto
- [X] T012 [US1] `app/produtos/[categoria]/page.tsx`: busca a categoria pelo slug; se não existe, `resolverRedirecionamentoCategoria` → `permanentRedirect(/produtos/<slug>)`, senão `notFound()`; o título e os chips usam `nome`
- [X] T013 [US1] `app/produtos/[categoria]/[slug]/page.tsx`: sem produto → `resolverRedirecionamentoProduto` → `permanentRedirect`, senão `notFound()`; o breadcrumb e a ficha técnica exibem o nome da categoria
- [X] T014 [P] [US1] `components/produtos/ProdutoCard.tsx`: nova prop opcional `categoriaNome` para o rótulo; os chamadores (`app/produtos/page.tsx`, `app/produtos/[categoria]/page.tsx` e outros que renderizam `ProdutoCard`) passam o nome a partir de `mapaNomesCategorias`
- [X] T015 [P] [US1] `lib/produtos/feedMeta.ts`: `product_type` = nome da categoria (recebe o mapa slug→nome), ajustando `app/api/feeds/meta/route.ts` e `lib/produtos/feedMeta.test.ts`

**Checkpoint**: vitrine sem duplicatas e links antigos funcionando.

## Phase 4: US2: Escolher a categoria no cadastro/edição (P1)

**Goal**: substituir o texto livre por um seletor com busca; sem escolha, o produto vai para Diversos.
**Independent Test**: criar um produto com "Religioso" e outro sem categoria (vai para Diversos).

- [X] T016 [P] [US2] Componente `components/admin/SelectBusca.tsx` (client, combobox acessível: campo de busca filtrando por `gerarSlug` parcial, lista ao abrir, setas/Enter/Esc, clique fora fecha, `disabled`, `onChange(valor)`) com estilos em `components/admin/admin.module.css`
- [X] T017 [US2] `lib/produtos/validation.ts`: `categoria` deixa de ser obrigatória (vazia/ausente = `diversos` na rota); ajustar `lib/produtos/validation.test.ts`
- [X] T018 [US2] `app/api/produtos/route.ts` (POST): categoria vazia → `diversos`; slug inexistente → `400 {campos:{categoria}}` via `slugCategoriaValido`; `revalidatePath("/produtos", "layout")`
- [X] T019 [US2] `app/api/produtos/[id]/route.ts` (PATCH): valida a categoria; se `categoria` e/ou `nome` mudam, recalcula o slug livre no destino, registra o redirecionamento do endereço antigo e revalida `/` e `/produtos`; corrige o 500 da troca de categoria sem troca de nome
- [X] T020 [US2] `components/admin/ProdutoForm.tsx`: nova prop `categorias: {slug, nome}[]`, `<input id="categoria">` → `SelectBusca` com placeholder "Diversos (padrão)"; as páginas `app/admin/(painel)/produtos/novo/page.tsx` e `app/admin/(painel)/produtos/[id]/editar/page.tsx` carregam e passam as categorias
- [X] T021 [US2] `components/admin/SimuladorPrecificacao.tsx` e `app/api/mercado-livre/simular-preco/route.ts`: aceitar a categoria vazia (tratar como `diversos`) sem quebrar a simulação

**Checkpoint**: novos cadastros só com categorias válidas.

## Phase 5: US3: Gerenciar categorias no admin (P2)

**Goal**: CRUD, ordem e remoção com os produtos movidos para Diversos.
**Independent Test**: criar "Natal", recusar "natal", renomear, reordenar e remover com produto.

- [X] T022 [US3] Repositório: `criarCategoria`, `renomearCategoria`, `reordenarCategorias(ids)`, `removerCategoria(id)` (403 se padrão; move os produtos via `moverProdutoDeCategoria`; transfere slug/aliases para Diversos; retorna `produtosMovidos`) e `contarProdutosPorCategoria` em `lib/categorias/repository.ts`, com testes
- [X] T023 [P] [US3] `app/api/admin/categorias/route.ts` (GET com `totalProdutos`, POST 201/400/409)
- [X] T024 [P] [US3] `app/api/admin/categorias/[id]/route.ts` (PATCH 200/400/404/409, DELETE 200/403/404) com `revalidatePath`
- [X] T025 [P] [US3] `app/api/admin/categorias/ordem/route.ts` (PUT 204/400)
- [X] T026 [P] [US3] Testes das rotas (coleção, item e ordem) em `app/api/admin/categorias/route.test.ts`
- [X] T027 [US3] Página `app/admin/(painel)/categorias/page.tsx` (server, `force-dynamic`) + `components/admin/CategoriasLista.tsx` (client: criar, renomear inline, setas de ordem, remover com `ConfirmModal` informando "N produtos serão movidos para Diversos", `Toast` de sucesso/erro, sem remover em Diversos)
- [X] T028 [US3] Link "Categorias" em `app/admin/(painel)/layout.tsx`

## Phase 6: US4: Trocar a categoria na listagem (P2)

**Goal**: troca direta por linha, com busca.
**Independent Test**: trocar um produto para "Religioso" na listagem e ver na vitrine.

- [X] T029 [US4] `components/admin/TrocarCategoriaProduto.tsx` (client): `SelectBusca` com a categoria atual; ao selecionar, `PATCH /api/produtos/[id] {categoria}`; confirmação discreta; em erro, restaura o valor anterior e mostra a mensagem da API
- [X] T030 [US4] `app/admin/(painel)/produtos/page.tsx`: carrega as categorias e troca `<td>{produto.categoria}</td>` por `TrocarCategoriaProduto`

## Phase 7: US5: Links antigos continuam funcionando (P2)

**Goal**: redirecionamento em um único salto após troca, renomeação de produto ou remoção de categoria.
**Independent Test**: anotar a URL, trocar a categoria e acessar a URL antiga.

- [X] T031 [US5] Teste de fluxo em `lib/categorias/redirecionamentos.test.ts`: A→B→C resolve para C em um salto; produto removido → null; destino que colide com produto existente não redireciona (a página encontra o produto antes)
- [X] T032 [US5] Carrinho: `app/carrinho/page.tsx` mantém o link com `encodeURIComponent(item.categoria)`. Conferir que o item antigo com texto acentuado cai no redirecionamento (sem mudança de código se o teste passar)

## Phase 8: Polish

- [X] T033 [P] `lib/home/secoesPublicas.ts` e os demais usos de `ProdutoCard` exibem o nome da categoria (conferir com `grep "produto.categoria"`)
- [X] T034 Rodar `npm test` e `npx tsc --noEmit`, e corrigir o que falhar
- [X] T035 Atualizar `quickstart.md` se algum passo mudou e preparar o Test Guide final

## Dependencies
- Setup (T001–T003) → Foundational (T004–T007) → US1 (MVP).
- US2 depende de T016 (SelectBusca) e da Foundational. US4 depende de T016 e T019.
- US3 depende de T007 (mover produto). US5 é validação transversal após US1–US4.

## Parallel examples
- Foundational: T004 ‖ (T002, T003 prontos).
- US1: T011 ‖ T014 ‖ T015 após T010.
- US3: T023 ‖ T024 ‖ T025 após T022.

## Implementation strategy
MVP = Phases 1–3 (migração + vitrine sem duplicatas + redirecionamentos de leitura). Em seguida US2 (sem isso novas duplicatas não são possíveis, já que a categoria vira slug validado), depois US3/US4 e o polish.
