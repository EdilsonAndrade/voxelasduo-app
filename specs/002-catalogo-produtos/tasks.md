# Tasks: Catálogo de Produtos (CRUD)

**Input**: Design documents from `specs/002-catalogo-produtos/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/produtos-api.md, quickstart.md, design-tokens.md (paleta, tipografia e motivo visual aprovados pelo usuário — todas as tarefas de UI abaixo devem seguir esse arquivo)

**Tests**: Testes unitários incluídos para a lógica de domínio nova (validação e slug), conforme decisão registrada em `research.md` (§4) — não há testes de integração/E2E nesta tarefa, e nenhuma instância é subida pelo agente (regra do projeto); testes manuais ficam no Test Guide final.

**Organization**: Tarefas agrupadas por user story (spec.md) para permitir implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: US1 (admin cadastra), US2 (visitante navega/visualiza), US3 (admin edita/remove), US4 (busca/filtro)

---

## Phase 1: Setup

- [X] T001 Instalar dependências: `@vercel/blob` (produção) e `vitest` + `@vitejs/plugin-react` se necessário (dev); adicionar script `"test": "vitest run"` em `package.json`
- [X] T002 [P] Criar `vitest.config.ts` na raiz do projeto (ambiente node, suporte a TypeScript path alias `@/`)
- [X] T003 [P] Adicionar `BLOB_READ_WRITE_TOKEN` (comentado, sem valor real) em `.env.example`
- [X] T003a Aplicar os design tokens de `design-tokens.md` em `app/globals.css` (cores claro/escuro, fontes Google — Fraunces, Work Sans, Space Mono) e em `app/layout.tsx` (link das fontes); implementar o mecanismo de tema: atributo `data-theme` na raiz, **padrão fixo "claro"** (não seguir `prefers-color-scheme`), com toggle persistido em `localStorage` (`voxelas-theme`) — componente `components/ThemeToggle.tsx`

**Checkpoint**: dependências instaladas, `npx vitest run` executa (mesmo sem testes ainda) sem erro de configuração; tema claro visível por padrão em `app/page.tsx` independente da configuração do sistema operacional.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Base de dados, validação e storage que todas as user stories consomem

**⚠️ CRITICAL**: Nenhuma user story pode ser finalizada sem esta fase

- [X] T004 Estender `lib/models/produto.ts` com o campo `slug: string` na interface `Produto`
- [X] T005 [P] Criar `lib/produtos/slug.ts`: função `gerarSlug(nome: string): string` (normaliza para minúsculas, remove acentos, troca espaços por hífen, remove caracteres não alfanuméricos)
- [X] T006 [P] Criar `lib/produtos/validation.ts`: função `validarProduto(payload, { parcial })` que valida `nome`, `descricao`, `categoria` (não vazios), `preco` (inteiro > 0), `estoque` (inteiro >= 0) e `fotos` (array com ao menos 1 item), retornando lista de erros por campo (FR-002)
- [X] T007 Criar `lib/produtos/repository.ts` com funções: `listarProdutos({ q?, categoria? })`, `buscarProdutoPorId(id)`, `buscarProdutoPorCategoriaESlug(categoria, slug)`, `criarProduto(dados)`, `atualizarProduto(id, dados)`, `removerProduto(id)`, `listarCategorias()` (via `distinct("categoria")`) — usa `lib/db/mongodb.ts` e `lib/models/produto.ts` (depende de T004)
- [X] T008 Em `lib/produtos/repository.ts` (ou função de inicialização chamada por ele), garantir os índices MongoDB: único composto `{ categoria: 1, slug: 1 }` e simples `{ categoria: 1 }` (depende de T007)
- [X] T009 [P] Criar `lib/storage/blob.ts`: funções `enviarFotoProduto(arquivo)` (valida tipo `image/jpeg|png|webp` e tamanho máx. 5MB, envia via `@vercel/blob` com acesso público, retorna URL) e `removerFotoProduto(url)` (FR-003)

**Checkpoint**: Fundação pronta — `npx tsc --noEmit` passa; user stories podem começar.

---

## Phase 3: User Story 1 - Administrador cadastra um novo produto (Priority: P1) 🎯 MVP

**Goal**: Permitir que o administrador cadastre um produto completo (com fotos) e ele passe a existir na base.

**Independent Test**: Acessar `/admin/produtos/novo`, preencher o formulário com fotos, salvar, e confirmar que o produto aparece em `/admin/produtos`.

### Tests for User Story 1

- [X] T010 [P] [US1] Testes unitários de `validarProduto` em `lib/produtos/validation.test.ts` cobrindo: payload válido, `preco <= 0`, `estoque < 0`, campo obrigatório ausente, `fotos` vazio
- [X] T011 [P] [US1] Testes unitários de `gerarSlug` em `lib/produtos/slug.test.ts` cobrindo: nome com acentos/maiúsculas, espaços múltiplos, caracteres especiais

### Implementation for User Story 1

- [X] T012 [US1] Implementar `POST` em `app/api/produtos/route.ts`: valida com `validarProduto`, gera `slug` com `gerarSlug` (reverificando unicidade por categoria via repository), cria com `criarProduto`, retorna 201 ou 400 com erros por campo (depende de T006, T005, T007)
- [X] T013 [US1] Implementar `app/api/produtos/upload/route.ts` (`POST`, `multipart/form-data`): usa `enviarFotoProduto`, retorna `{ url }` ou 400 com erro (depende de T009)
- [X] T014 [US1] Criar `app/admin/produtos/novo/page.tsx`: formulário (nome, descrição, preço, estoque, categoria, upload múltiplo de fotos) que primeiro envia cada foto para `/api/produtos/upload`, depois envia o produto para `POST /api/produtos`; exibe erros de validação por campo (FR-002, FR-003)
- [X] T015 [US1] Criar `app/admin/produtos/page.tsx`: listagem administrativa simples (Server Component, usa `listarProdutos`) mostrando todos os produtos (inclusive sem estoque) com link para "novo produto" e para editar cada um (link usado pela US3)

**Checkpoint**: US1 completa e testável de forma independente — cadastro de produto funcional ponta a ponta.

---

## Phase 4: User Story 2 - Visitante navega e visualiza produtos (Priority: P2)

**Goal**: Vitrine pública com listagem e página de detalhe de produto.

**Independent Test**: Com produtos já cadastrados (via US1 ou inseridos diretamente no banco), acessar `/produtos` e abrir o detalhe de um produto.

### Implementation for User Story 2

- [X] T016 [P] [US2] Criar componente `components/produtos/ProdutoCard.tsx`: exibe foto principal (`fotos[0]`), nome, preço formatado, categoria, e indicador visual de "indisponível" quando `estoque === 0` (FR-008)
- [X] T017 [US2] Criar `app/produtos/page.tsx` (Server Component): usa `listarProdutos()` (sem busca/filtro ainda — isso é US4), renderiza grid de `ProdutoCard`, com mensagem clara quando não houver produtos (FR-006, FR-008) (depende de T016)
- [X] T018 [US2] Criar `app/produtos/[categoria]/[slug]/page.tsx` (Server Component): usa `buscarProdutoPorCategoriaESlug`; renderiza galeria de fotos, descrição completa, preço, estoque/indisponibilidade; chama `notFound()` do Next.js quando o produto não existir (FR-007, FR-008, FR-012)
- [X] T019 [US2] Criar `app/produtos/[categoria]/[slug]/not-found.tsx`: página de "produto não encontrado" com link de volta para `/produtos` (FR-012, SC-005)
- [X] T020 [US2] Criar `app/produtos/[categoria]/page.tsx`: listagem pré-filtrada pela categoria da URL, reutilizando `ProdutoCard` e a mesma mensagem de "sem produtos" (depende de T016)

**Checkpoint**: US1 + US2 funcionam juntas — cadastro e vitrine pública ponta a ponta.

---

## Phase 5: User Story 3 - Administrador edita ou remove um produto (Priority: P3)

**Goal**: Manter o catálogo atualizado (editar campos/fotos, remover produto).

**Independent Test**: Abrir um produto existente em `/admin/produtos/[id]/editar`, alterar um campo e salvar; depois remover um produto e confirmar que some da vitrine pública.

### Implementation for User Story 3

- [X] T021 [US3] Implementar `app/api/produtos/[id]/route.ts` — `GET` (retorna produto por id ou 404), `PATCH` (valida com `validarProduto({ parcial: true })`, regenera `slug` se `nome` mudar, chama `atualizarProduto`) e `DELETE` (chama `removerFotoProduto` para cada URL em `fotos`, depois `removerProduto`; 204 ou 404) (depende de T006, T007, T009)
- [X] T022 [US3] Criar `app/admin/produtos/[id]/editar/page.tsx`: formulário pré-preenchido (reaproveitando a UI de campos de T014), permite adicionar/remover fotos individualmente, salvar (`PATCH`) e remover o produto (`DELETE`, com confirmação) (FR-004, FR-005)

**Checkpoint**: US1 + US2 + US3 funcionam juntas — CRUD completo do lado do administrador refletido na vitrine pública.

---

## Phase 6: User Story 4 - Visitante busca e filtra produtos por categoria (Priority: P4)

**Goal**: Busca textual e filtro por categoria na vitrine pública.

**Independent Test**: Com produtos de categorias variadas cadastrados, buscar um termo e filtrar por categoria em `/produtos`, conferindo que os resultados correspondem.

### Implementation for User Story 4

- [X] T023 [US4] Estender `listarProdutos` em `lib/produtos/repository.ts` para aceitar `q` (regex case-insensitive sobre `nome`/`descricao`) e `categoria` (filtro exato), combináveis (depende de T007; ver research.md §3)
- [X] T024 [US4] Atualizar `GET` em `app/api/produtos/route.ts` para ler `q` e `categoria` da query string e repassar a `listarProdutos` (depende de T012, T023)
- [X] T025 [US4] Atualizar `app/produtos/page.tsx` para ler `searchParams` (`q`, `categoria`), repassar a `listarProdutos`, e exibir campo de busca + lista de categorias (via `listarCategorias`) como filtro (depende de T017, T023)
- [X] T026 [US4] Exibir mensagem clara de "nenhum resultado encontrado" em `app/produtos/page.tsx` e `app/produtos/[categoria]/page.tsx` quando a busca/filtro não retornar produtos (FR-011)

**Checkpoint**: Todas as user stories funcionam de forma independente e integrada.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T027 [P] Revisar todos os textos voltados ao usuário (formulários, mensagens de erro, "não encontrado", "sem resultados") garantindo que estão centralizados por componente/tela em português, preparados para futura extração i18n (research.md §5)
- [X] T028 Rodar o fluxo de verificação do `quickstart.md`: `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run build` — corrigir eventuais erros
- [X] T029 Escrever o Test Guide final (passos manuais de admin e público) a ser entregue ao usuário, conforme regra do projeto (sem subir instância)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup — bloqueia todas as user stories
- **US1 (Phase 3)**: depende só da Foundational — é o MVP
- **US2 (Phase 4)**: depende só da Foundational (pode ser testada com dados inseridos manualmente, mas normalmente roda após US1 existir)
- **US3 (Phase 5)**: depende da Foundational; reaproveita UI de formulário de US1 (T014) — por isso vem depois na ordem sugerida, embora tecnicamente independente
- **US4 (Phase 6)**: depende da Foundational e estende o `GET` já criado em US1 (T012) e a página de listagem de US2 (T017)
- **Polish (Phase 7)**: depende de todas as user stories desejadas estarem completas

### Parallel Opportunities

- T002, T003 em paralelo (Setup)
- T005, T006, T009 em paralelo (Foundational — arquivos distintos); T004 e T007/T008 são sequenciais entre si
- T010, T011 em paralelo (testes de US1)
- T016 pode começar em paralelo com T012/T013 (componente de UI não depende da API)

## Implementation Strategy

### MVP First

1. Phase 1 → Phase 2 (Foundational, bloqueante)
2. Phase 3 (US1) — parar e validar: cadastro de produto funcional
3. Entregar/demonstrar se suficiente

### Entrega incremental

1. Setup + Foundational → base pronta
2. US1 → cadastro funcional (MVP)
3. US2 → vitrine pública consumindo os produtos cadastrados
4. US3 → manutenção do catálogo (editar/remover)
5. US4 → busca e filtro sobre o catálogo já existente
6. Polish → revisão de textos, verificação final, Test Guide
