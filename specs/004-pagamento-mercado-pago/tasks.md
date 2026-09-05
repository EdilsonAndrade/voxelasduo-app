---

description: "Task list for feature implementation"
---

# Tasks: Integração de Pagamento (Mercado Pago)

**Input**: Design documents from `/specs/004-pagamento-mercado-pago/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: O projeto usa Vitest desde a Tarefa 2 — tarefas de teste incluídas para as regras de negócio novas (conversão de valores, mapeamento de status, assinatura do webhook).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project (Next.js App Router)**: `app/`, `lib/`, `components/` na raiz do repositório, conforme plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependências novas e extensão do modelo de dados compartilhados por todas as histórias.

- [X] T001 Instalar as dependências `mercadopago` (SDK server) e `@mercadopago/sdk-react` (Payment Brick) via npm
- [X] T002 [P] Adicionar `TentativaPagamento`, `StatusTentativaPagamento` e detalhar `PagamentoPedido` (`metodo`, `status`, `referenciaExterna`, `tentativas`) em `lib/models/pedido.ts` (data-model.md #1)

**Checkpoint**: Dependências instaladas e modelo pronto para as fases seguintes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de domínio usada tanto pela criação de pagamento (US1) quanto pelo webhook (US2).

- [X] T003 [P] Criar `lib/pagamentos/conversao.ts` com `centavosParaReais` e `reaisParaCentavos` (research.md #5)
- [X] T004 [P] Escrever testes em `lib/pagamentos/conversao.test.ts` (arredondamento, valores nas duas pontas)
- [X] T005 [P] Criar `lib/pagamentos/status.ts` com `mapearStatusMercadoPago(status)` → `"pendente" | "aprovado" | "recusado" | "expirado"` (`pending`/`in_process` → pendente; `approved` → aprovado; `rejected` → recusado; `cancelled` → expirado)
- [X] T006 [P] Escrever testes em `lib/pagamentos/status.test.ts` (todos os status de origem do Mercado Pago mapeados)
- [X] T007 Criar `lib/pagamentos/mercadopago.ts`: client `MercadoPagoConfig` com `MERCADOPAGO_ACCESS_TOKEN`, `criarPagamento(payload)` e `buscarPagamento(id)` usando o SDK `mercadopago` — depende de T001
- [X] T008 Adicionar a `lib/pagamentos/repository.ts`: `buscarTentativaAtivaRecente(pedidoId)`, `registrarTentativa(pedidoId, tentativa)` e `atualizarStatusTentativa(pedidoId, referenciaExterna, novoStatus, dadosPagamento?)` — a última promove `pedido.status` para `"pago"` de forma condicional/idempotente (data-model.md #3) — depende de T002

**Checkpoint**: Domínio de pagamento pronto para ser consumido pelas rotas de API.

---

## Phase 3: User Story 1 - Visitante paga o pedido sem sair do site (Priority: P1) 🎯 MVP

**Goal**: Payment Brick (cartão de crédito e Pix) embutido em `/pedido/[id]`, criando uma tentativa de pagamento real junto ao Mercado Pago para o pedido pendente.

**Independent Test**: Com um pedido "pendente", abrir `/pedido/[id]`, pagar com um cartão de teste aprovado (ou gerar Pix de teste) e confirmar que a tentativa é criada no Mercado Pago com o valor correto do pedido, sem sair do site.

### Implementation for User Story 1

- [X] T009 [P] [US1] Implementar `POST /api/pagamentos` em `app/api/pagamentos/route.ts`: valida `pedidoId`/`formData`, bloqueia pedido inexistente (404) ou já `"pago"`/com tentativa ativa recente (409), monta o payload com `transaction_amount` (via T003) sempre lido do pedido e `external_reference = pedidoId`, chama `mercadopago.criarPagamento` (T007) e registra a tentativa (T008) — depende de T007, T008
- [X] T010 [P] [US1] Criar `components/pagamento/PagamentoBrick.tsx` (Client Component com `@mercadopago/sdk-react`, Payment Brick restrito a cartão de crédito + Pix, `initialization.amount` a partir do pedido, indicação visual "pagamento seguro processado pelo Mercado Pago", `onSubmit` chamando `POST /api/pagamentos`) e `components/pagamento/pagamento.module.css` — depende de T009
- [X] T011 [US1] Integrar `PagamentoBrick` em `app/pedido/[id]/page.tsx`: quando `pedido.status === "pendente"`, renderiza o Brick; quando `"pago"`, mantém a confirmação já existente da Tarefa 3 — depende de T010

**Checkpoint**: Fluxo feliz de pagamento funcional e testável isoladamente (MVP).

---

## Phase 4: User Story 2 - Pedido é confirmado automaticamente via webhook (Priority: P1)

**Goal**: Webhook do Mercado Pago valida assinatura, busca o pagamento pela API e promove o pedido para `"pago"` de forma idempotente, mesmo sem o visitante na página.

**Independent Test**: Disparar uma notificação de teste do Mercado Pago (ou reenviá-la) para `POST /api/pagamentos/webhook` referenciando uma tentativa aprovada e confirmar que o pedido passa a `"pago"`; reenviar a mesma notificação e confirmar que nada muda.

### Implementation for User Story 2

- [X] T012 [P] [US2] Criar `lib/pagamentos/webhook.ts` — **desvio do plano**: o SDK `mercadopago` já expõe `WebhookSignatureValidator` (HMAC-SHA256 oficial, mesmo algoritmo do research.md #7); `assinaturaWebhookValida()` envolve esse validador em vez de reimplementar HMAC manualmente
- [X] T013 [P] [US2] Escrever testes em `lib/pagamentos/webhook.test.ts` (assinatura válida, secret errado, dataId divergente, header ausente, header malformado)
- [X] T014 [US2] Implementar `POST /api/pagamentos/webhook` em `app/api/pagamentos/webhook/route.ts`: `401` se assinatura inválida; busca o pagamento via `mercadopago.buscarPagamento` (T007), localiza o pedido por `external_reference`, chama `atualizarStatusTentativa` (T008); responde `200` em qualquer processamento bem-sucedido (inclui pedido não encontrado) e `500` em falha transitória, conforme research.md #8 — depende de T007, T008, T012

**Checkpoint**: US1 + US2 juntas — pagamento aprovado confirma o pedido de ponta a ponta, mesmo assíncrono.

---

## Phase 5: User Story 3 - Visitante entende e reage a pagamento recusado, pendente ou expirado (Priority: P2)

**Goal**: Feedback claro de recusa/pendência/expiração na própria página, com opção de tentar novamente sobre o mesmo pedido.

**Independent Test**: Pagar com um cartão de teste recusado e confirmar que a página informa a recusa e permite nova tentativa sem criar um segundo pedido; repetir para Pix pendente e para expiração.

### Implementation for User Story 3

- [X] T015 [P] [US3] Criar `components/pagamento/StatusPagamento.tsx`: exibe o resultado da tentativa mais recente (aprovado/recusado/pendente/expirado) com mensagem apropriada e CTA "tentar novamente" quando aplicável — implementado junto de T010/T011 (mesmo componente que já hospeda o Brick controla o estado do resultado)
- [X] T016 [US3] Integrar `StatusPagamento` ao fluxo de `PagamentoBrick`/`app/pedido/[id]/page.tsx`: após a resposta de `POST /api/pagamentos`, exibe o resultado e, se recusado/expirado, permite reiniciar o Brick (remonta com nova `key`) sobre o mesmo pedido pendente, sem novo checkout
- [X] T017 [US3] Tratar no cliente a resposta `409`/erro de `POST /api/pagamentos` (tentativa em andamento, pedido já pago, falha ao processar): exibida acima do Brick via estado `erroEnvio` em `PagamentoBrick.tsx`

**Checkpoint**: Todas as três histórias funcionando de ponta a ponta.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificação final da feature completa.

- [X] T018 Executar `npx tsc --noEmit`, `npx vitest run` (54/54 passaram) e `npm run build` — todos ok. `npm run lint` pulado: `next lint` foi removido no Next.js 16 e o projeto nunca migrou para `eslint.config.*` — lacuna pré-existente, fora do escopo desta tarefa

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — começa imediatamente.
- **Foundational (Phase 2)**: Depende de T001 (SDK instalado) e T002 (modelo estendido).
- **US1 (Phase 3)**: Depende de Foundational (T007, T008).
- **US2 (Phase 4)**: Depende de Foundational (T007, T008); independente de US1 em termos de arquivos, mas testável de ponta a ponta apenas com uma tentativa criada por US1.
- **US3 (Phase 5)**: Depende de US1 (T011, integra na mesma página/fluxo).
- **Polish (Phase 6)**: Após todas as histórias.

### User Story Dependencies

- **User Story 1 (P1)**: Depende apenas do Foundational — é o caminho feliz mínimo (MVP).
- **User Story 2 (P1)**: Depende apenas do Foundational — pode ser implementada em paralelo a US1 (arquivos diferentes), mas seu teste independente pressupõe uma tentativa já existente.
- **User Story 3 (P2)**: Depende de US1 (estende a mesma UI de pagamento com os estados de erro).

### Within Each User Story

- Domínio puro (conversão, status, assinatura) antes das rotas de API que os consomem.
- Testes unitários junto das funções que testam (mesmo arquivo de entrega).
- História completa antes de avançar para a próxima prioridade.

### Parallel Opportunities

- T003/T004, T005/T006 podem rodar em paralelo entre si.
- T009 (rota) e T010 (componente) podem ser feitos em paralelo, integrando em T011.
- T012/T013 (webhook) podem avançar em paralelo a toda a Phase 3 (US1), integrando em T014.

---

## Parallel Example: User Story 1

```bash
# Backend em paralelo com UI:
Task: "T009 Implementar POST /api/pagamentos em app/api/pagamentos/route.ts"
Task: "T010 Criar components/pagamento/PagamentoBrick.tsx"

# Depois da integração:
Task: "T011 Integrar PagamentoBrick em app/pedido/[id]/page.tsx (depende de T010)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001–T002)
2. Phase 2: Foundational (T003–T008)
3. Phase 3: US1 (T009–T011)
4. **STOP and VALIDATE**: pagar um pedido de teste com cartão aprovado e confirmar a tentativa criada
5. Continuar se pronto

### Incremental Delivery

1. Setup + Foundational + US1 → Pagamento embutido funcional (MVP)
2. + US2 → Confirmação automática via webhook, idempotente
3. + US3 → Feedback e retry para recusado/pendente/expirado
4. Cada história agrega valor sem quebrar as anteriores

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências entre si.
- [Story] mapeia a tarefa à história para rastreabilidade.
- Novas dependências desta feature: `mercadopago`, `@mercadopago/sdk-react` (ver research.md #1).
- Abatimento de estoque (EDI-78) NÃO faz parte destas tarefas (FR-010).
- Textos de UI em PT-BR inline, seguindo o padrão atual do projeto.
- Após cada tarefa ou grupo lógico, validar com `npx tsc --noEmit` e `npx vitest run`.
