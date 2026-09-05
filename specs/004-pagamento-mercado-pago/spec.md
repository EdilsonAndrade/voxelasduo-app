# Feature Specification: Integração de Pagamento (Mercado Pago)

**Feature Branch**: `edilsonaandrade/edi-77-tarefa-4-integracao-de-pagamento-mercado-pago`
**Created**: 2026-09-04
**Status**: Draft
**Input**: Linear EDI-77 (épico EDI-73, projeto Voxelas Duo) — "Tarefa 4: Integração de pagamento (Mercado Pago)": pagamento embutido no site (cartão de crédito e Pix) via Mercado Pago; confirmação assíncrona de pagamento; pedido passa a "pago" quando confirmado; tratar pendente, recusado e expirado. Continuação da Tarefa 3 (EDI-76), que já cria o pedido com status "pendente". Abatimento de estoque fica fora de escopo (EDI-78/Tarefa 5).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitante paga o pedido sem sair do site (Priority: P1) 🎯 MVP

Como visitante que acabou de confirmar o checkout (pedido "pendente"), quero pagar com cartão de crédito ou Pix diretamente na página do site, com a garantia visível de que o pagamento é processado com segurança pelo Mercado Pago, para concluir minha compra sem ser redirecionado para outro site.

**Why this priority**: É o objetivo central da tarefa — sem isso não existe conversão de pedido pendente em venda paga.

**Independent Test**: Com um pedido "pendente" existente, acessar a etapa de pagamento, pagar com um cartão de teste aprovado (ou Pix de teste) e confirmar que o pedido passa a "pago" e o visitante vê uma confirmação de sucesso.

**Acceptance Scenarios**:

1. **Given** um pedido "pendente" recém-criado no checkout, **When** o visitante escolhe pagar com cartão de crédito e informa dados de um cartão de teste aprovado, **Then** o pagamento é processado sem sair do site e o pedido passa a "pago".
2. **Given** um pedido "pendente", **When** o visitante escolhe pagar via Pix, **Then** o site exibe o código/QR Pix de teste para pagamento sem redirecionar para outro site.
3. **Given** a etapa de pagamento está sendo exibida, **When** o visitante observa a tela, **Then** há indicação clara de que o pagamento é processado com segurança pelo Mercado Pago.

---

### User Story 2 - Pedido é confirmado automaticamente mesmo se o visitante sair da página (Priority: P1)

Como visitante que pagou mas fechou a aba antes de ver a confirmação (ex: pagamento por Pix que demora para compensar), quero que meu pedido seja atualizado para "pago" assim que o pagamento for confirmado pelo Mercado Pago, para não perder a garantia da compra.

**Why this priority**: Pagamento por Pix e alguns cartões podem confirmar de forma assíncrona; sem essa confirmação automática, pedidos pagos ficariam presos como "pendente" indefinidamente.

**Independent Test**: Simular uma notificação de confirmação de pagamento vinda do Mercado Pago para um pedido pendente e verificar que o status do pedido muda para "pago" sem qualquer ação do visitante, e que reenviar a mesma notificação não duplica o efeito.

**Acceptance Scenarios**:

1. **Given** um pedido "pendente" com pagamento em processamento, **When** o Mercado Pago confirma o pagamento (mesmo sem o visitante estar na página), **Then** o pedido passa a "pago".
2. **Given** um pagamento já confirmado e o pedido já marcado "pago", **When** a mesma confirmação de pagamento é recebida novamente, **Then** o pedido permanece "pago" sem duplicar pedidos ou efeitos colaterais.
3. **Given** uma notificação de pagamento chega referenciando um pedido inexistente ou com valor diferente do valor do pedido, **When** o sistema processa essa notificação, **Then** ela é rejeitada e nenhum pedido é alterado.

---

### User Story 3 - Visitante entende e reage a pagamento recusado, pendente ou expirado (Priority: P2)

Como visitante cujo pagamento não foi aprovado de primeira (recusado, expirado, ou ainda pendente de compensação), quero entender claramente o que aconteceu e poder tentar pagar novamente, sem precisar refazer o checkout inteiro.

**Why this priority**: Cobre os desvios do caminho feliz; sem isso o visitante fica sem saber o que houve e pode desistir da compra ou tentar comprar de novo do zero, duplicando pedidos.

**Independent Test**: Forçar um pagamento de teste recusado e confirmar que o site informa a recusa e permite nova tentativa sobre o mesmo pedido "pendente", sem criar um segundo pedido.

**Acceptance Scenarios**:

1. **Given** o visitante paga com um cartão de teste que é recusado, **When** o resultado retorna, **Then** o site informa que o pagamento foi recusado e oferece tentar novamente sobre o mesmo pedido.
2. **Given** o visitante paga via Pix, **When** o pagamento ainda está aguardando compensação, **Then** o site exibe claramente o status "pagamento pendente" (distinto de "pago").
3. **Given** a tentativa de pagamento expira sem confirmação, **When** o visitante retorna à página do pedido, **Then** o site indica que o prazo expirou e oferece uma nova tentativa de pagamento sobre o mesmo pedido.

---

### Edge Cases

- O que acontece se o visitante tentar pagar um pedido que já está "pago"? O sistema deve impedir uma nova cobrança e apenas mostrar a confirmação existente.
- O que acontece se a notificação de confirmação de pagamento chegar antes de o pedido terminar de ser salvo (condição de corrida)? Deve haver reprocessamento seguro sem perda da confirmação.
- O que acontece se o visitante abrir duas abas e tentar pagar o mesmo pedido pendente duas vezes ao mesmo tempo? Apenas uma tentativa de pagamento deve valer; a segunda não pode gerar cobrança duplicada.
- O que acontece se o pedido "pendente" nunca for pago (visitante desiste)? O pedido permanece "pendente" — sem alteração de estoque, sem expiração automática nesta tarefa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que o visitante pague um pedido "pendente" com cartão de crédito ou Pix sem sair do site.
- **FR-002**: O sistema DEVE exibir, na etapa de pagamento, indicação clara de que o processamento é feito com segurança pelo Mercado Pago.
- **FR-003**: O sistema DEVE atualizar automaticamente o pedido para "pago" ao receber a confirmação do pagamento, independentemente de o visitante permanecer na página.
- **FR-004**: O sistema DEVE ignorar/rejeitar confirmações de pagamento que não correspondam a um pedido existente ou cujo valor não bata com o valor total do pedido.
- **FR-005**: O sistema DEVE processar cada confirmação de pagamento de forma idempotente — reenvios da mesma notificação não podem duplicar efeitos.
- **FR-006**: O sistema DEVE informar ao visitante quando um pagamento for recusado, permitindo nova tentativa sobre o mesmo pedido pendente (sem criar um pedido duplicado).
- **FR-007**: O sistema DEVE exibir um status "pagamento pendente" (distinto de "pago" e de "recusado") quando o pagamento ainda estiver em compensação (ex: Pix).
- **FR-008**: O sistema DEVE informar ao visitante quando uma tentativa de pagamento expirar, permitindo nova tentativa sobre o mesmo pedido pendente.
- **FR-009**: O sistema DEVE impedir uma nova cobrança sobre um pedido que já esteja "pago".
- **FR-010**: O sistema NÃO DEVE alterar o estoque dos produtos ao confirmar um pagamento (fora de escopo desta tarefa).

### Key Entities

- **Pedido**: já existe (Tarefa 3); ganha nesta tarefa o detalhamento do pagamento — método usado (cartão/Pix), status financeiro (pendente/pago/recusado/expirado) e referência externa da transação no Mercado Pago.
- **Tentativa de Pagamento**: cada intenção de pagamento associada a um pedido pendente; guarda o resultado (aprovado, recusado, pendente, expirado) e permite nova tentativa sem gerar novo pedido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O visitante consegue concluir o pagamento (cartão ou Pix) sem sair do site.
- **SC-002**: O status do pedido reflete o resultado real do pagamento mesmo quando o visitante fecha a página antes da confirmação (checagem via nova visita à página do pedido).
- **SC-003**: Reenvio de uma mesma confirmação de pagamento nunca resulta em pedido duplicado ou em cobrança duplicada.
- **SC-004**: Um visitante com pagamento recusado ou expirado consegue tentar pagar novamente sem refazer os dados de checkout (cliente/endereço/itens).

## Assumptions

- Este fluxo cobre apenas vendas feitas pelo site (canal "site"); vendas na Shopee/Mercado Livre não passam por este pagamento.
- Testes e desenvolvimento usam credenciais de teste (sandbox) do Mercado Pago; credenciais de produção são configuradas apenas ao publicar.
- Métodos de pagamento desta tarefa são cartão de crédito e Pix, conforme o ticket original — outros métodos (ex: boleto) ficam fora de escopo.
- Checkout continua sem autenticação (guest), como definido na Tarefa 3.
- Abatimento de estoque ao confirmar pagamento fica fora de escopo desta tarefa (EDI-78/Tarefa 5).
