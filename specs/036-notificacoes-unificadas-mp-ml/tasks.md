# Tasks: Notificações unificadas MP + ML (EDI-132)

**Input**: Design documents from `/specs/036-notificacoes-unificadas-mp-ml/`
**Tests**: incluídos (padrão do projeto: Vitest para lógica pura e rotas com mocks).

## Phase 1: Setup

- [X] T001 Adicionar `CodigoFalhaPagamento`, `FalhaPagamento` e `PagamentoPedido.ultimaFalha?` em lib/models/pedido.ts (data-model.md)

## Phase 2: Foundational

- [X] T002 Em lib/pagamentos/repository.ts: `registrarFalhaPagamento(pedidoId, falha)` ($set `pagamento.ultimaFalha`); `promoverPedidoSeAprovado` com filtro `status ∉ {pago, cancelado}`, `$unset` de `pagamento.ultimaFalha` e retorno indicando pedido cancelado (research #5)

## Phase 3: User Story 1 — Endereço único de notificações (P1) 🎯 MVP

**Goal**: qualquer URL configurada processa MP (Webhook/IPN) e todos os tópicos do ML.
**Independent Test**: POST de aviso MP e aviso ML em `/api/notificacoes` produzem o efeito esperado.

- [X] T003 [P] [US1] Função pura `identificarNotificacao({ query, corpo, topicoPadrao })` em lib/notificacoes/identificar.ts (research #1)
- [X] T004 [P] [US1] Testes de identificação (ML por tópico, ML sem tópico com padrão, MP webhook, MP IPN, merchant_order, desconhecido) em lib/notificacoes/identificar.test.ts
- [X] T005 [P] [US1] Mover lógica das rotas do ML para lib/notificacoes/mercadoLivre/{pedidos,perguntas,reclamacoes,mensagens,envios}.ts como `processar*(payload): Promise<Response>` sem mudar comportamento
- [X] T006 [US1] Processador de pagamento em lib/notificacoes/pagamento.ts: busca no MP, 404 → 200 + warn, falha → 500 + error, sem referência → 200, recusado/expirado → `registrarFalhaPagamento` origem "notificacao", aprovado em pedido cancelado → falha `aprovado_pedido_cancelado`
- [X] T007 [US1] Despachante `despacharNotificacao(request, { topicoPadrao? })` em lib/notificacoes/despachante.ts: lê query/corpo uma vez, valida `x-signature` só para MP com header (401 + warn), chama processador, loga tópicos desconhecidos (research #2/#3)
- [X] T008 [P] [US1] Testes do despachante (401 com assinatura inválida, IPN sem assinatura aceito, ML não exige assinatura, roteamento por tópico) em lib/notificacoes/despachante.test.ts
- [X] T009 [US1] Rota nova app/api/notificacoes/route.ts e rotas antigas app/api/pagamentos/webhook/route.ts e app/api/webhooks/mercado-livre/*/route.ts delegando ao despachante com `topicoPadrao`
- [X] T010 [US1] Rodar testes existentes das rotas do ML (app/api/webhooks/mercado-livre/*/route.test.ts) e ajustar mocks para os novos módulos

## Phase 4: User Story 2 — Verificar manualmente no admin (P2)

**Goal**: botão no detalhe do pedido pendente conclui o pedido como o aviso faria.
**Independent Test**: pedido pendente com pagamento aprovado → clique → pago + e-mails.

- [X] T011 [US2] `verificarPagamentoPedido(pedidoId, origem)` em lib/pagamentos/verificacao.ts (research #4), grava `ultimaFalha` exceto pendente da origem "cliente"
- [X] T012 [P] [US2] Testes de `verificarPagamentoPedido` (pago, pendente, recusado, sem tentativa, não encontrado, falha, cancelado) em lib/pagamentos/verificacao.test.ts
- [X] T013 [US2] app/api/pagamentos/verificar/route.ts usando `verificarPagamentoPedido(..., "cliente")` mantendo o contrato atual
- [X] T014 [US2] Rota admin app/api/pedidos/[id]/verificar-pagamento/route.ts (+ route.test.ts) conforme contracts/api.md
- [X] T015 [US2] Botão "Verificar pagamento no Mercado Pago" no detalhe de pedido do site pendente em components/admin/PedidosLista.tsx, com toast do resultado e atualização do status na lista

## Phase 5: User Story 3 — Conferência automática (P3)

- [X] T016 [US3] `conferirPendentesRecentes({ limite: 20, dias: 7 })` em lib/pagamentos/verificacao.ts (+ teste)
- [X] T017 [US3] Conferência com timeout de 4s antes de listar em app/admin/(painel)/pedidos/page.tsx
- [X] T018 [US3] Rota de cron app/api/pagamentos/conferir-pendentes/route.ts (+ route.test.ts) com `CRON_SECRET` e cron 06:00 em vercel.ts

## Phase 6: User Story 4 — Motivo da falha visível (P3)

- [X] T019 [US4] `ultimaFalha` em `PedidoResumo`/`PedidoDetalhado` em lib/pedidos/apresentacao.ts
- [X] T020 [US4] Exibir motivo + data no detalhe e indicador ⚠ na linha em components/admin/PedidosLista.tsx; estilo em components/admin/admin.module.css

## Phase 7: Polish

- [X] T021 `npx tsc --noEmit` e `npm test` sem falhas
- [X] T022 Atualizar quickstart.md com o resultado e o guia de teste

## Dependencies

T001 → T002 → US1 (T003–T010) → US2 (T011–T015) → US3 (T016–T018); US4 (T019–T020) depende só de T001/T002. MVP = US1.

## Parallel

T003/T004/T005 juntos; T008 após T007; T012 com T013.
