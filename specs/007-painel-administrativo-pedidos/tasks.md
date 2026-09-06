---

description: "Task list for feature implementation"
---

# Tasks: Painel administrativo de pedidos

**Input**: Design documents from `/specs/007-painel-administrativo-pedidos/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: O projeto usa Vitest desde a Tarefa 2 — tarefas de teste incluídas para a lógica de domínio nova (filtro/paginação, detalhe com item sem correspondência, atualização de status), seguindo o mesmo padrão das Tarefas 1-7 (sem mock do driver do MongoDB; sem testes de componente React — o projeto não usa React Testing Library, mesmo padrão de `ProdutoForm.tsx`/`AdminProdutosPage`).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project (Next.js App Router)**: `app/`, `lib/`, `components/` na raiz do repositório, conforme plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tipos de apresentação e estilos compartilhados por todas as histórias — nenhuma dependência nova.

- [X] T001 [P] Criar `lib/pedidos/apresentacao.ts` com os tipos `PedidoResumo` (id, canalOrigem, status, cliente `{ nome, email }`, valorTotal, criadoEm, `temItemSemCorrespondencia`) e `PedidoDetalhado` (itens resolvidos com `nome`/`semCorrespondencia`, cliente completo, pagamento, origemExterna) e as funções `paraPedidoResumo(pedido, produtos)` / `paraPedidoDetalhado(pedido, produtos)` que fazem o mapeamento a partir de `Pedido` (data-model.md, contracts/pedidos-admin.md)
- [X] T002 [P] Estender `components/admin/admin.module.css`: badges de status (`badgeStatusPendente` âmbar, `badgeStatusPago` verde reaproveitando `#2f8f52`, `badgeStatusEnviado` `var(--roxo)`, `badgeStatusCancelado` reaproveitando `#c23a3a`) e badges de canal (`badgeCanalSite` neutro como `.badge` já existente, `badgeCanalMercadoLivre` `var(--roxo)`, `badgeCanalShopeeEmBreve` borda tracejada + `var(--texto-soft)` + `var(--font-hand)`, mesma linguagem visual do `.empty` já existente)

**Checkpoint**: Tipos de apresentação e estilos prontos para as fases seguintes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Camada de dados (listagem com filtro/paginação e detalhe) reaproveitada por todas as histórias.

**⚠️ CRITICAL**: Nenhuma história pode ser validada de ponta a ponta antes desta fase.

- [X] T003 Estender `lib/pedidos/repository.ts`: `listarPedidos({ canal?, status?, pagina? }): Promise<{ pedidos: Pedido[]; total: number }>` — monta filtro Mongo opcional (`canalOrigem`, `status`), `skip`/`limit` de 20 sobre o índice `criadoEm: -1` já existente (Tarefa 3); quando `canal === "shopee"`, retorna `{ pedidos: [], total: 0 }` sem consultar o banco (research.md #1, #3)
- [X] T004 [P] ~~Estender `lib/pedidos/repository.test.ts`~~ — **Desvio do plano**: sem teste próprio, mesmo motivo já registrado na Tarefa 7 (T008/T013 de `specs/006-integracao-mercado-livre/tasks.md`) — `listarPedidos` é essencialmente CRUD direto sobre o Mongo (filtro + skip/limit) e o projeto não mocka o driver do MongoDB; o curto-circuito de `canal === "shopee"` é a única lógica pura, coberta manualmente via quickstart.md
- [X] T005 ~~Criar `buscarPedidoDetalhado`~~ — **Desvio do plano**: função desnecessária — `buscarPedidoPorId` (já existente) já retorna o `Pedido` completo; a rota de detalhe (T009) usa `buscarPedidoPorId` direto e aplica `paraPedidoDetalhado` (T001) por cima, sem uma camada extra só de repasse
- [X] T006 [P] ~~Teste de `buscarPedidoDetalhado`~~ — **Desvio do plano**: não se aplica, função não criada (ver T005); `buscarPedidoPorId` já é usado sem teste próprio desde a Tarefa 3

**Checkpoint**: Camada de dados pronta — listagem filtrada/paginada e busca de detalhe disponíveis para as rotas.

---

## Phase 3: User Story 1 - Ver todos os pedidos em um só lugar (Priority: P1) 🎯 MVP

**Goal**: Uma única lista mostra os pedidos do site e do Mercado Livre juntos, com canal, status, cliente, valor e data; abrir um pedido mostra seus itens e pagamento.

**Independent Test**: Acessar `/admin/pedidos` com pedidos de site e Mercado Livre já existentes e conferir que todos aparecem juntos, mais recentes primeiro; abrir o detalhe de um confere itens/pagamento; painel vazio mostra mensagem sem erro.

### Implementation for User Story 1

- [X] T007 [US1] Estender `app/api/pedidos/route.ts` (`GET`, hoje um esqueleto sem filtro da Tarefa 1): lê `searchParams` (`canal`, `status`, `pagina`), chama `listarPedidos` (T003), mapeia cada pedido com `paraPedidoResumo` (T001, resolvendo produtos via `buscarProdutosPorIds` já existente) e retorna `{ pedidos, totalPaginas, paginaAtual }` (contracts/pedidos-admin.md) — depende de T001, T003
- [X] T008 [P] [US1] Estender `app/api/pedidos/route.test.ts`: testes do `GET` (pedidos de site e Mercado Livre juntos, mais recentes primeiro; lista vazia sem erro; item sem produto correspondente marca `temItemSemCorrespondencia`) — depende de T007
- [X] T009 [US1] Criar `app/api/pedidos/[id]/route.ts` (`GET`): chama `buscarPedidoPorId` (T005 não criou wrapper novo — ver desvio), mapeia com `paraPedidoDetalhado` (T001), `404` com `{ erro: "Pedido não encontrado." }` quando não existir (contracts/pedidos-admin.md) — depende de T001
- [X] T010 [P] [US1] Criar `app/api/pedidos/[id]/route.test.ts` (`GET`): pedido existente retorna detalhe completo; id inexistente retorna 404 — depende de T009
- [X] T011 [US1] Criar `app/admin/pedidos/page.tsx` (Server Component, `export const dynamic = "force-dynamic"` como em `app/admin/produtos/page.tsx`): busca `listarPedidos` direto do repository (sem round-trip HTTP, mesmo padrão de `AdminProdutosPage`), renderiza tabela (canal, status, cliente, valor, data) com badges (T002) e mensagem de vazio (`styles.empty`) quando não houver pedidos
- [X] T012 [US1] Criar `components/admin/PedidosLista.tsx` (Client Component): recebe os pedidos da página e permite expandir um pedido para ver o detalhe (chama `GET /api/pedidos/[id]`, T009), mostrando itens (com aviso quando `semCorrespondencia`) e dados de pagamento

**Checkpoint**: MVP pronto — todos os pedidos do site e do Mercado Livre visíveis em um só lugar, com detalhe.

---

## Phase 4: User Story 2 - Filtrar e localizar pedidos (Priority: P2)

**Goal**: A administradora filtra a lista por canal e por status; selecionar "Shopee" mostra lista vazia com aviso de integração pendente, sem erro.

**Independent Test**: Aplicar filtro de canal "Mercado Livre" e conferir que só pedidos desse canal aparecem; aplicar filtro de status "enviado" e conferir o mesmo; selecionar "Shopee" e ver o aviso, sem quebra de tela.

### Implementation for User Story 2

- [X] T013 [US2] Estender `app/admin/pedidos/page.tsx`: lê `searchParams.canal`/`searchParams.status` e repassa para `listarPedidos` (T003/T007); adiciona os controles de filtro (select de canal — incluindo "Shopee" — e select de status) que navegam atualizando a URL — depende de T007, T011
- [X] T014 [US2] Estender `components/admin/PedidosLista.tsx` (ou o próprio `page.tsx`): quando `canal === "shopee"` está selecionado, exibe o texto "Integração com a Shopee pendente de aprovação" no lugar da tabela/estado vazio padrão, usando o badge `badgeCanalShopeeEmBreve` (T002) — depende de T002, T013

**Checkpoint**: Filtros funcionando; Shopee aparece como opção preparada, sem nenhuma chamada real à API da Shopee (FR-007/FR-008).

---

## Phase 5: User Story 3 - Atualizar status manualmente (Priority: P1)

**Goal**: A administradora muda o status de um pedido (ex: para "enviado") a partir do painel, com confirmação, e vê o novo status refletido imediatamente.

**Independent Test**: Abrir um pedido "pago", escolher o status "enviado", confirmar no modal e ver o toast de sucesso com a lista já mostrando "enviado".

### Implementation for User Story 3

- [X] T015 [US3] Criar `lib/pedidos/atualizarStatus.ts`: `atualizarStatusPedido(id: string, novoStatus: StatusPedido): Promise<Pedido | null>` — grava `status` + `atualizadoEm` via `findOneAndUpdate`, retorna `null` se o `id` não existir; sem validação de transição de estado (research.md #2). **Desvio do plano**: a validação do enum não fica aqui — a rota (T017) já valida `status` contra `STATUS_PEDIDO` (mesma constante usada no filtro do `GET`, `lib/models/pedido.ts`) antes de chamar esta função, então `atualizarStatusPedido` sempre recebe um `StatusPedido` válido e vira CRUD direto sobre o Mongo, sem lógica pura própria para testar
- [X] T016 [P] [US3] ~~Teste de `atualizarStatus.ts`~~ — **Desvio do plano**: sem teste próprio, mesmo motivo de T004 — CRUD direto sobre o Mongo; a validação de enum (a única lógica pura) é coberta pelo teste do `PATCH` em T018, que exercita a mesma constante `STATUS_PEDIDO` já usada e testada pelo `GET` (T008)
- [X] T017 [US3] Estender `app/api/pedidos/[id]/route.ts` (`PATCH`): valida `body.status`, `400` com `{ erro: "Status inválido." }` se fora do enum, chama `atualizarStatusPedido` (T015), `404` se não encontrado, `200` com `{ pedido: { id, status, atualizadoEm } }` (contracts/pedidos-admin.md) — depende de T015
- [X] T018 [P] [US3] Estender `app/api/pedidos/[id]/route.test.ts` (`PATCH`): status válido atualiza; status inválido retorna 400; id inexistente retorna 404 — depende de T017
- [X] T019 [US3] Estender `components/admin/PedidosLista.tsx`: seletor de novo status por pedido + `ConfirmModal` (reaproveitado de `components/admin/ConfirmModal.tsx`) antes de chamar `PATCH /api/pedidos/[id]` (T017); sucesso mostra `Toast` (reaproveitado de `components/admin/Toast.tsx`) e atualiza o status exibido sem recarregar a página — depende de T012, T017

**Checkpoint**: As três histórias completas — listagem unificada, filtros e atualização manual de status, com Shopee preparada só na interface.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificação final da feature completa.

- [X] T020 `npx tsc --noEmit` (ok), `npx vitest run` (135/135 passaram, 25 arquivos) e `npm run build` (ok — `/admin/pedidos`, `/api/pedidos` e `/api/pedidos/[id]` listados como rotas dinâmicas)
- [X] T021 Revisado `contracts/pedidos-admin.md` e `data-model.md` contra o implementado: sem divergência de formato de resposta. Único ajuste: `buscarPedidoDetalhado` (data-model.md) não foi criado como função própria — a rota usa `buscarPedidoPorId` direto (ver desvio em T005/T009); comportamento e contrato de resposta permanecem os mesmos

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — começa imediatamente.
- **Foundational (Phase 2)**: Depende de T001 (tipos) para T005; T003 é independente de T001.
- **US1 (Phase 3)**: Depende do Foundational completo (T001, T003, T005).
- **US2 (Phase 4)**: Depende do Foundational e de US1 (estende `page.tsx`/`PedidosLista.tsx` criados em T011/T012) — não é independente em arquivo, mas seu teste independente (filtrar) não exige a US3.
- **US3 (Phase 5)**: Depende do Foundational e de US1 (estende `PedidosLista.tsx` e `app/api/pedidos/[id]/route.ts` criados em T009/T012) — seu teste independente (mudar status) não exige a US2.
- **Polish (Phase 6)**: Após todas as histórias.

### User Story Dependencies

- **User Story 1 (P1)**: Depende do Foundational; é pré-requisito prático das outras duas (só há o que filtrar ou atualizar depois de existir a listagem/detalhe).
- **User Story 2 (P2)**: Depende do Foundational e de US1 (mesmos arquivos de UI); pode ser implementada em paralelo à US3 por serem trechos distintos de `PedidosLista.tsx`.
- **User Story 3 (P1)**: Depende do Foundational e de US1; pode ser implementada em paralelo à US2.

### Within Each User Story

- Tipos/modelo antes de repository.
- Repository antes de rotas de API.
- Rotas de API antes de UI que as consome.
- História completa antes de avançar para a próxima prioridade.

### Parallel Opportunities

- T001 e T002 podem rodar em paralelo entre si (Setup).
- T004 e T006 podem rodar em paralelo entre si (arquivos diferentes de teste, mesma extensão de `repository.ts`... na prática, aplicar em sequência se editarem o mesmo arquivo de teste).
- T008 e T010 podem rodar em paralelo entre si (arquivos de teste diferentes).
- US2 (T013/T014) e US3 (T015-T018) podem avançar em paralelo depois de US1 pronta; T019 (UI de status) só depois de T012 e T017.

---

## Parallel Example: Foundational

```bash
# Em paralelo:
Task: "T001 Criar lib/pedidos/apresentacao.ts"
Task: "T002 Estender components/admin/admin.module.css"

# Depois:
Task: "T003 Estender lib/pedidos/repository.ts com listarPedidos"
Task: "T005 Estender lib/pedidos/repository.ts com buscarPedidoDetalhado (depende de T001)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001-T002)
2. Phase 2: Foundational (T003-T006)
3. Phase 3: US1 (T007-T012)
4. **STOP and VALIDATE**: acessar `/admin/pedidos` e conferir a listagem unificada e o detalhe
5. Continuar se pronto

### Incremental Delivery

1. Setup + Foundational + US1 → Listagem unificada de pedidos (MVP)
2. + US2 → Filtro por canal/status, com Shopee preparada só na UI
3. + US3 → Atualização manual de status com confirmação e toast
4. Cada história agrega valor sem quebrar as anteriores

---

## Notes

- [P] tasks = arquivos diferentes ou trechos independentes, sem dependência de conclusão entre si.
- [Story] mapeia a tarefa à história para rastreabilidade.
- Nenhuma dependência nova de pacote; nenhuma env var nova.
- Nenhuma chamada real à API da Shopee nesta tarefa — `canal: "shopee"` é só um valor de enum já existente em `Pedido.canalOrigem` (Tarefa 7) exibido na UI (FR-007/FR-008, research.md #3). Isso está registrado no card EDI-81 para revisão quando a Shopee Open Platform aprovar o acesso.
- `/admin/pedidos` fica sem autenticação real nesta tarefa, mesmo estado atual de `/admin/produtos` — dependência explícita da Tarefa 9/EDI-86 (research.md #4).
- Sem validação de transição de estado no `PATCH` de status (research.md #2) — decisão deliberada, não uma lacuna.
- Textos de UI em PT-BR inline, seguindo o padrão I18N já existente do projeto (sem `next-intl`, research.md #5).
- Sem testes de componente React (`PedidosLista.tsx`, `page.tsx`) — o projeto não usa React Testing Library; testes cobrem a lógica de domínio (`repository.ts`, `atualizarStatus.ts`) e as rotas de API, mesmo padrão das Tarefas 1-7.
- Após cada tarefa ou grupo lógico, validar com `npx tsc --noEmit` e `npx vitest run`.
