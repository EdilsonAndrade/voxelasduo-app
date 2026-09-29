# Tasks: Notificar a loja por e-mail quando uma venda do site for paga

## Phase 1: User Story 1 (P1) 🎯 MVP

- [X] T001 [US1] Extrair `destinatariosLoja()` (admin + loja, sem duplicar) e usar em `notificarAdminNovaEncomenda` em lib/email/resend.ts
- [X] T002 [US1] Implementar `notificarAdminVendaSite(pedido)` (itens com nome, total, forma de pagamento, comprador, endereço, link do admin, replyTo no comprador, HTML escapado, best-effort) em lib/email/resend.ts
- [X] T003 [US1] Testes (destinatários, conteúdo, fallback "Produto", escape, falha não lança) em lib/email/resend.test.ts
- [X] T004 [US1] Disparar `notificarAdminVendaSite` após `enviarConfirmacaoPedido` em `promoverPedidoSeAprovado` em lib/pagamentos/repository.ts
- [X] T005 [US1] Testes (dispara uma vez; não dispara em reprocessamento nem em tentativa não aprovada) em lib/pagamentos/repository.test.ts

## Phase 2: Polish

- [X] T006 Rodar `npm test` e `npx tsc --noEmit`
