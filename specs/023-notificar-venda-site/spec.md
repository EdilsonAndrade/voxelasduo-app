# Feature Specification: Notificar a loja por e-mail quando uma venda do site for paga

**Feature Branch**: `edilsonaandrade/edi-110-notificar-a-loja-por-e-mail-quando-uma-venda-do-site-for`
**Created**: 2026-09-28
**Status**: Draft
**Input**: Linear EDI-110 — "Notificar a loja por e-mail quando uma venda do site for paga"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receber e-mail de venda paga no site (Priority: P1)

Quando um pedido feito no site (inclusive os que chegam pela loja do Facebook/Instagram, que finalizam a compra no site) tem o pagamento aprovado, a loja recebe um e-mail com o que foi vendido, quanto, para quem e para onde enviar — sem precisar ficar olhando o admin.

**Why this priority**: Hoje só o comprador é avisado; a loja pode demorar para perceber a venda e atrasar a produção/envio.

**Independent Test**: Fazer uma compra aprovada no site e conferir o e-mail na caixa da loja.

**Acceptance Scenarios**:

1. **Given** um pedido do site pendente, **When** o pagamento é aprovado, **Then** a loja recebe um e-mail "Nova venda no site" com número do pedido, itens (quantidade, nome, subtotal), valor total, forma de pagamento, nome/e-mail/telefone do comprador, endereço de entrega completo e link para os pedidos pagos no admin.
2. **Given** a mesma aprovação chega duas vezes (resposta imediata + webhook), **When** o pedido já estava pago, **Then** nenhum e-mail novo é enviado.
3. **Given** o envio do e-mail falha, **When** o pagamento é aprovado, **Then** o pedido continua pago, o estoque é abatido e o comprador ainda recebe a confirmação.
4. **Given** o e-mail da loja é respondido, **When** a loja clica em responder, **Then** a resposta vai para o e-mail do comprador.

### Edge Cases

- `ADMIN_NOTIFICACAO_EMAIL` não configurada: o e-mail vai para o e-mail da loja (voxelasduo@gmail.com), igual à notificação de encomenda.
- Produto do pedido removido depois: aparece como "Produto".
- Nome/endereço com caracteres especiais ou HTML: exibidos escapados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST enviar um e-mail à loja exatamente uma vez por pedido do site promovido a pago.
- **FR-002**: Destinatários: `ADMIN_NOTIFICACAO_EMAIL` (se definida) + e-mail da loja, sem duplicar; `replyTo` = e-mail do comprador.
- **FR-003**: O e-mail MUST conter número do pedido, itens, valor total, forma de pagamento, dados do comprador, endereço de entrega e link para `/admin/pedidos?status=pago`.
- **FR-004**: Falha no envio MUST ser logada e nunca impedir a confirmação do pagamento, o abatimento de estoque ou o e-mail do comprador.
- **FR-005**: Textos digitados pelo comprador MUST ser escapados no HTML.

### Key Entities

- **Pedido** (existente): fonte de itens, cliente, endereço, valor e pagamento. Sem mudança de modelo.

## Success Criteria *(mandatory)*

- **SC-001**: 100% das vendas pagas no site geram um único e-mail para a loja.
- **SC-002**: A loja sabe da venda em até 1 minuto após a aprovação do pagamento.

## Assumptions

- Mesma infraestrutura de e-mail (Resend) e layout das demais notificações.
- Só pedidos do site; vendas do Mercado Livre já têm aviso próprio.
