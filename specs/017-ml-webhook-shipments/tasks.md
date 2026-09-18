# Tasks: Rastreio automático via webhook de envios do Mercado Livre

**Input**: Design documents from `specs/017-ml-webhook-shipments/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/webhook-shipments.md, quickstart.md

**Tests**: Incluídos para a lógica em `lib/` e para o endpoint (`route.ts`) — padrão já existente do projeto (Vitest, `*.test.ts` co-localizados, mesmo de `pedidos/route.test.ts`). Sem teste direto em `lib/pedidos/repository.ts` (toca o Mongo diretamente) — mesma adaptação já registrada em EDI-98/tasks.md, o projeto não tem harness de Mongo em memória; a função nova é coberta indiretamente pelo teste do endpoint, que a mocka.

**Organization**: 2 user stories. US1 (P1) é o MVP — preenchimento automático. US2 (P2) não tem implementação nova (a edição manual já existe desde EDI-84); só confirma, com teste e manualmente, que a automação não bloqueia nem quebra o fluxo manual.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Mesmo projeto único Next.js (ver plan.md): `lib/`, `app/`.

---

## Phase 1: Setup

Nenhuma tarefa de código necessária — projeto, dependências e ambiente já existentes; nenhuma biblioteca nova (plan.md). A ativação do tópico na aplicação do Mercado Livre ("Minhas Aplicações") é uma etapa manual, fora do código — ver quickstart.md.

---

## Phase 2: Foundational

Nenhuma tarefa bloqueante necessária — a única peça reaproveitada por mais de uma story (`atualizarRastreioPedido`/`atualizarStatusPedido`) já existe desde EDI-84; nada novo precisa ser construído antes de começar US1.

---

## Phase 3: User Story 1 - Rastreio preenchido automaticamente ao despachar (Priority: P1) 🎯 MVP

**Goal**: Ao chegar uma notificação `shipments`, o pedido correspondente no site tem rastreio e status atualizados automaticamente, sem edição manual.

**Independent Test**: Simular a notificação do tópico `shipments` (curl, quickstart.md) para uma venda existente com envio despachado; verificar que o pedido correspondente passa a ter `rastreio.codigo`/`transportadora` preenchidos e, se aplicável, status atualizado.

### Tests for User Story 1

- [X] T001 [P] [US1] Teste de `buscarEnvioMercadoLivre` em `lib/estoque/canais/mercadoLivre/envios.test.ts` (mapeia `status`/`tracking_number` de `GET /shipments/{id}` + `order_id` de `GET /shipments/{id}/items`; falha em qualquer uma das duas chamadas propaga erro — research.md #1)
- [X] T002 [P] [US1] Teste do endpoint de callback em `app/api/webhooks/mercado-livre/envios/route.test.ts` (`application_id` correto processa, divergente ignora; despachado atualiza rastreio e status `enviado`; entregue atualiza status `entregue`; sem `tracking_number` não sobrescreve rastreio com vazio; sem pedido correspondente ignora sem erro — FR-009; falha na consulta responde 500 sem persistir — mesmo padrão de `pedidos/route.test.ts`)

### Implementation for User Story 1

- [X] T003 [P] [US1] Criar `lib/estoque/canais/mercadoLivre/envios.ts`: `buscarEnvioMercadoLivre(shipmentId)` — `GET /shipments/{id}` (status, `tracking_number`) + `GET /shipments/{id}/items` (`order_id`), reaproveitando `obterAccessTokenValido`/`erroMercadoLivre` (research.md #1)
- [X] T004 [US1] Adicionar `buscarPedidoPorOrigemExterna(pedidoExternoId)` em `lib/pedidos/repository.ts`, ao lado de `buscarPedidoPorId`/`buscarPedidoPorIdempotencia` já existentes (data-model.md)
- [X] T005 [US1] Criar `app/api/webhooks/mercado-livre/envios/route.ts`: valida `application_id`, extrai id de `resource`, busca detalhe (T003), resolve o pedido (T004); sem pedido correspondente responde 200 sem persistir (FR-009); com pedido, chama `atualizarRastreioPedido` quando houver `tracking_number` (FR-005) e `atualizarStatusPedido` quando o status mapear para `enviado`/`entregue` (FR-006, research.md #2) — mesmo contrato de `pedidos/route.ts` (contracts/webhook-shipments.md) — depende de T003, T004

**Checkpoint**: US1 completa e testável de forma independente — envios despachados/entregues no Mercado Livre atualizam o pedido no site automaticamente.

---

## Phase 4: User Story 2 - Administradora ainda pode editar o rastreio manualmente (Priority: P2)

**Goal**: A automação nunca bloqueia a edição manual do rastreio já existente (Tarefa 10/EDI-84) — o mesmo campo continua editável a qualquer momento.

**Independent Test**: Num pedido com rastreio preenchido automaticamente (US1), editar o rastreio manualmente pelo admin (`PATCH /api/pedidos/[id]`, já existente) e confirmar que salva normalmente; depois, uma nova notificação `shipments` mais recente volta a atualizar o valor (FR-008).

### Tests for User Story 2

- [X] T006 [US2] Estender `app/api/webhooks/mercado-livre/envios/route.test.ts` (T002): notificação processada após uma edição manual aplica o `$set` mais recente do Mercado Livre normalmente, sem lógica especial de bloqueio (FR-008, research.md #4 — nenhuma proteção contra sobrescrita, por decisão registrada em spec.md/Assumptions)

### Implementation for User Story 2

Nenhuma implementação nova — `PATCH /api/pedidos/[id]` (`app/api/pedidos/[id]/route.ts`) e o formulário de rastreio no admin (`PedidosLista.tsx`) já existem desde EDI-84 e não são alterados por esta feature. US2 é garantida por construção: o webhook de US1 escreve no mesmo campo `rastreio` via `atualizarRastreioPedido`, sem adicionar trava nenhuma.

**Checkpoint**: US1 e US2 funcionam de forma independente — rastreio automático e edição manual convivem no mesmo campo, sem bloqueio.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T007 [P] **Pendente do usuário**: registrar o tópico `shipments` na aplicação do Mercado Livre ("Minhas Aplicações") — etapa manual, fora do código, exige acesso à conta de desenvolvedor (quickstart.md)
- [X] T008 `npx tsc --noEmit` (ok), `npx vitest run` (387/387 passaram, 61 arquivos) e `npm run build` (ok — `/api/webhooks/mercado-livre/envios` listada)
- [ ] T009 **Pendente do usuário**: validar `quickstart.md` (simular notificação via curl e conferir em `/admin/pedidos`) — não executado aqui por instrução do projeto (CLAUDE.md: não subir instância/container para testar; ver Test Guide)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** e **Foundational (Phase 2)**: sem tarefas de código — US1 pode começar imediatamente.
- **US1 (Phase 3)**: sem dependência de outra story.
- **US2 (Phase 4)**: depende apenas do endpoint criado em US1 existir para o teste de regressão (T006); não adiciona código próprio.
- **Polish (Phase 5)**: depende de US1 (e US2) completas.

### Within User Story 1

- Testes antes da implementação correspondente.
- `lib/estoque/canais/mercadoLivre/envios.ts` (integração) e `lib/pedidos/repository.ts` (finder) antes do endpoint de callback, que depende dos dois.

### Parallel Opportunities

- T001 e T002 podem ser escritos em paralelo (arquivos diferentes).
- T003 e T004 podem ser feitos em paralelo (arquivos diferentes, sem dependência entre si) antes de T005.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 3 (US1 — rastreio automático).
2. **PARAR e VALIDAR**: testar US1 de forma independente (Independent Test acima).
3. Entregar/demonstrar se pronto — já cobre o ganho central do ticket (elimina cópia manual de rastreio).

### Incremental Delivery

1. US1 (rastreio automático) → validar → deploy/demo (MVP).
2. US2 (confirmação de que a edição manual continua livre) → validar com o teste de regressão → deploy/demo.

---

## Notes

- [P] = arquivos diferentes, sem dependência entre si.
- Nenhuma dependência nova de npm (research.md).
- O endpoint de callback segue exatamente o contrato já usado por `orders_v2`/EDI-98 (200 para confirmar recebimento, 500 só em falha transitória) — contracts/webhook-shipments.md.
- Sem mudança de schema em `Pedido` — só reaproveita `rastreio`/`status` já existentes (data-model.md).
