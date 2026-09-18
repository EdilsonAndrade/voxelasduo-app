# Feature Specification: Aviso de venda aguardando liberação para postagem (Mercado Livre)

**Feature Branch**: `edilsonaandrade/edi-105-mercado-livre-exibir-no-admin-quando-a-venda-esta-aguardando`
**Created**: 2026-09-18
**Status**: Draft
**Input**: EDI-105 — Mercado Livre: exibir no admin quando a venda está aguardando liberação para postagem

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver que uma venda ainda não pode ser postada (Priority: P1) 🎯 MVP

Como administradora da loja, quero ver na listagem de pedidos quando uma venda do Mercado Livre ainda está aguardando liberação para postagem (e a partir de quando ela poderá ser postada), para não estranhar o atraso nem precisar checar isso manualmente no Mercado Livre.

**Why this priority**: É o problema relatado — situações como greve dos Correios atrasam a liberação da etiqueta, e hoje isso é invisível no site (o pedido só aparece como "Pago", sem explicação do atraso).

**Independent Test**: Simular a notificação do tópico `shipments` (mesmo webhook do EDI-101) para uma venda cujo envio ainda está aguardando liberação para postagem; verificar que o pedido aparece em `/admin/pedidos` com um aviso indicando isso e a data prevista.

**Acceptance Scenarios**:

1. **Given** uma venda do Mercado Livre paga, **When** o Mercado Livre notifica que o envio ainda está aguardando liberação para postar (com uma data prevista), **Then** o pedido correspondente passa a exibir, na listagem do admin, um aviso com essa data.
2. **Given** um pedido exibindo o aviso de aguardando liberação, **When** o envio é finalmente despachado (mesmo fluxo automático do EDI-101), **Then** o aviso desaparece e o pedido passa a mostrar o rastreio normalmente.
3. **Given** uma venda do Mercado Livre cujo envio já está pronto para postar (sem data de liberação futura), **When** a administradora olha a listagem de pedidos, **Then** nenhum aviso de "aguardando liberação" aparece — comportamento igual ao de hoje.

---

### Edge Cases

- Notificação chega para um envio de uma venda que ainda não existe como pedido no site → ignorar, mesmo comportamento já usado pelo webhook `shipments` (EDI-101, FR-009).
- Data de liberação informada já passou, mas o envio ainda não foi despachado → o aviso deixa de mostrar uma data futura e passa a indicar apenas que está aguardando liberação (sem previsão), evitando mostrar uma data no passado.
- Envio nunca chega a informar uma data de liberação (a maioria das vendas segue o fluxo normal) → nenhum aviso aparece, sem alteração de comportamento.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE capturar, ao processar uma notificação do tópico `shipments` (mesmo webhook do EDI-101), quando o envio ainda está aguardando liberação para postagem e a data prevista de liberação, quando informada.
- **FR-002**: O sistema DEVE exibir, na listagem de pedidos do admin, um aviso visível para pedidos cujo envio está aguardando liberação para postagem, incluindo a data prevista quando disponível.
- **FR-003**: O sistema DEVE remover o aviso automaticamente quando o envio deixar de estar nesse estado (ex.: for despachado — mesmo evento que já atualiza o rastreio no EDI-101).
- **FR-004**: O sistema NÃO DEVE alterar o status do pedido (ex.: "Pago") por causa desse aviso — é uma informação complementar sobre o envio, não uma mudança de status do pedido.
- **FR-005**: Pedidos cujo envio nunca esteve nesse estado (fluxo normal, sem atraso) NÃO DEVEM exibir nenhum aviso — comportamento inalterado.

### Key Entities *(include if feature involves data)*

- **Pedido (existente)**: ganha um campo informativo novo sobre o envio (data prevista de liberação para postagem, quando aplicável), preenchido/limpo automaticamente pelo mesmo webhook `shipments` do EDI-101. Sem impacto no `status` do pedido nem nas demais entidades.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma venda com envio aguardando liberação passa a mostrar o aviso na listagem do admin em até 5 minutos após a notificação do Mercado Livre.
- **SC-002**: O aviso desaparece automaticamente assim que o envio é despachado, sem ação manual.
- **SC-003**: A administradora consegue identificar, olhando só a listagem de pedidos (sem abrir o Mercado Livre), quais vendas estão atrasadas por liberação pendente e a partir de quando cada uma poderá ser postada.

## Assumptions

- O aviso é só informativo — nenhuma ação (automática ou manual) é esperada da administradora além de aguardar; a postagem em si continua sendo feita no Mercado Livre quando a etiqueta for liberada.
- A data de liberação, quando informada pelo Mercado Livre, é confiável o suficiente para exibir diretamente (sem necessidade de recalcular ou validar no site).
- Esta feature reaproveita 100% o webhook `shipments` já assinado no EDI-101 — nenhum tópico novo de notificação é necessário.
