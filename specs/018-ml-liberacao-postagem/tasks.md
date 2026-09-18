# Tasks: Aviso de venda aguardando liberação para postagem (Mercado Livre)

**Input**: Design documents from `specs/018-ml-liberacao-postagem/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/webhook-envios-liberacao.md, quickstart.md

**Tests**: Incluídos para a lógica em `lib/` e para o endpoint (`route.ts`) — estende os testes já existentes do EDI-101. Sem teste automatizado para o badge em `PedidosLista.tsx` (sem `jsdom` no projeto, mesmo padrão já aceito em EDI-98/EDI-99); verificado manualmente (Test Guide ao final).

**Organization**: 1 user story (P1, MVP) — feature pequena e coesa, sem stories independentes adicionais.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Mesmo projeto único Next.js (ver plan.md): `lib/`, `app/`, `components/`.

---

## Phase 1: Setup

Nenhuma tarefa necessária — reaproveita 100% o webhook e a configuração já existentes do EDI-101 (nenhum tópico novo a assinar).

---

## Phase 2: Foundational

Nenhuma tarefa bloqueante necessária.

---

## Phase 3: User Story 1 - Ver que uma venda ainda não pode ser postada (Priority: P1) 🎯 MVP

**Goal**: Pedido com envio em `buffered` mostra, na listagem do admin, um aviso com a data de liberação; o aviso some quando o envio sai desse estado.

**Independent Test**: Simular a notificação `shipments` (curl, quickstart.md) para um envio em `buffered`; verificar o aviso em `/admin/pedidos`; simular a evolução para `shipped` e confirmar que o aviso some.

### Tests for User Story 1

- [X] T001 [P] [US1] Estender `lib/estoque/canais/mercadoLivre/envios.test.ts`: `buscarEnvioMercadoLivre` retorna `aguardandoLiberacaoAte` quando `substatus === "buffered"` com data disponível; retorna `undefined` para qualquer outro substatus (research.md #1)
- [X] T002 [P] [US1] Estender `app/api/webhooks/mercado-livre/envios/route.test.ts`: envio em `buffered` chama `atualizarAguardandoLiberacaoPedido` com a data; envio em outro substatus chama com `null` (limpa); nenhuma mudança no `status` do pedido por causa disso (FR-004)

### Implementation for User Story 1

- [X] T003 [P] [US1] Adicionar `envioAguardandoLiberacaoAte?: Date` em `Pedido` (`lib/models/pedido.ts`, data-model.md)
- [X] T004 [US1] Estender `lib/estoque/canais/mercadoLivre/envios.ts`: `buscarEnvioMercadoLivre` também retorna `aguardandoLiberacaoAte?: Date` a partir do substatus `buffered` (research.md #1) — depende de T003 (tipo só para consistência, sem dependência de execução real)
- [X] T005 [US1] Adicionar `atualizarAguardandoLiberacaoPedido(id, data: Date | null)` em `lib/pedidos/atualizarStatus.ts` (mesmo padrão de `atualizarRastreioPedido`) — depende de T003
- [X] T006 [US1] Estender `app/api/webhooks/mercado-livre/envios/route.ts`: chama `atualizarAguardandoLiberacaoPedido` (T005) com a data quando `envio.aguardandoLiberacaoAte` existir, ou com `null` caso contrário — depende de T004, T005 (contracts/webhook-envios-liberacao.md)
- [X] T007 [US1] Estender `PedidoResumo`/`PedidoDetalhado` em `lib/pedidos/apresentacao.ts` para expor `envioAguardandoLiberacaoAte` (mesmo padrão de `rastreio` já exposto) — depende de T003
- [X] T008 [US1] Invocar a skill `frontend-design` (regra do projeto para qualquer alteração de UI) antes de estilizar o novo aviso
- [X] T009 [US1] Estender `components/admin/PedidosLista.tsx`: exibir aviso "aguardando liberação — libera em DD/MM" quando `envioAguardandoLiberacaoAte` estiver preenchido e no futuro; texto genérico "aguardando liberação para postagem" quando a data já passou (research.md #4); nada quando ausente — depende de T007, T008
- [X] T010 [US1] [P] Estilizar o novo aviso em `components/admin/admin.module.css` — depende de T008, T009

**Checkpoint**: US1 completa e testável de forma independente — vendas represadas por liberação de etiqueta ficam visíveis no admin, sem checar o Mercado Livre.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T011 `npx tsc --noEmit` (ok), `npx vitest run` (391/391 passaram, 61 arquivos) e `npm run build` (ok — sem regressão nas rotas/telas existentes)
- [ ] T012 **Pendente do usuário**: validar o nome exato do campo de data dentro do substatus `buffered` contra um envio real nesse estado (research.md #1) — a implementação usa o melhor entendimento disponível na pesquisa, mas a doc oficial bloqueou fetch automatizado
- [ ] T013 **Pendente do usuário**: validar `quickstart.md` (simular notificação via curl para um envio em `buffered` e conferir o aviso em `/admin/pedidos`) — não executado aqui por instrução do projeto (CLAUDE.md: não subir instância/container para testar; ver Test Guide)

---

## Dependencies & Execution Order

- **Setup/Foundational**: sem tarefas — US1 começa direto.
- Dentro de US1: testes antes da implementação; modelo (T003) antes de tudo que o usa; integração (T004) e repositório (T005) antes do endpoint (T006); endpoint e apresentação (T007) antes da UI (T009/T010).
- **Polish**: depende de US1 completa.

### Parallel Opportunities

- T001 e T002 em paralelo (arquivos diferentes).
- T003 pode começar em paralelo com os testes (T001/T002), já que só adiciona um campo opcional ao tipo.
- T010 (CSS) pode ser feito em paralelo com o restante depois que T008/T009 definirem a marcação.

---

## Implementation Strategy

Feature pequena, uma story só — implementar Phase 3 de ponta a ponta e validar (Independent Test acima) antes de considerar concluída.

---

## Notes

- [P] = arquivos diferentes, sem dependência entre si.
- Nenhuma dependência nova de npm (research.md).
- Nenhum tópico novo de notificação — reaproveita o webhook `shipments` do EDI-101 (spec.md/Assumptions).
- Sem mudança em `status`/`StatusPedido` — só um campo informativo novo (FR-004, research.md #2).
