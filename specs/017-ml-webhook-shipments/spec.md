# Feature Specification: Rastreio automático via webhook de envios do Mercado Livre

**Feature Branch**: `edilsonaandrade/edi-101-mercado-livre-assinar-webhook-de-envios-shipments-para`
**Created**: 2026-09-18
**Status**: Draft
**Input**: EDI-101 — Mercado Livre: assinar webhook de envios (shipments) para atualizar rastreio automaticamente

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rastreio preenchido automaticamente ao despachar (Priority: P1) 🎯 MVP

Como administradora da loja, quero que o código de rastreio e a transportadora de uma venda do Mercado Livre apareçam automaticamente em "Meus Pedidos"/admin assim que o envio é despachado, sem precisar copiar isso manualmente do Mercado Livre.

**Why this priority**: É o ganho central do ticket — elimina o trabalho manual de copiar rastreio do Mercado Livre para o site a cada venda despachada.

**Independent Test**: Simular a notificação do tópico `shipments` (curl, quickstart.md) para uma venda existente com envio despachado; verificar que o pedido correspondente passa a ter `rastreio.codigo`/`transportadora` preenchidos, sem edição manual.

**Acceptance Scenarios**:

1. **Given** uma venda do Mercado Livre já registrada como pedido no site (mesmo vínculo usado por `orders_v2`, EDI-80), **When** o envio é despachado e o Mercado Livre notifica o tópico `shipments`, **Then** o pedido correspondente passa a ter o código de rastreio e a transportadora preenchidos automaticamente.
2. **Given** um pedido com rastreio já preenchido automaticamente, **When** o status do envio evolui (ex.: "em trânsito" para "entregue"), **Then** o status do pedido no site é atualizado para refletir a entrega.

---

### User Story 2 - Administradora ainda pode editar o rastreio manualmente (Priority: P2)

Como administradora da loja, quero continuar podendo editar manualmente o rastreio de um pedido pelo admin, para os casos em que a notificação automática não chegou ou trouxe um dado incompleto.

**Why this priority**: Garante que a automação nunca vira um bloqueio — o fallback manual já existe (Tarefa 10/EDI-84) e precisa continuar funcionando exatamente como hoje.

**Independent Test**: Num pedido sem rastreio automático (ex.: venda sem vínculo com o Mercado Livre), preencher manualmente pelo admin como hoje e confirmar que continua salvando normalmente.

**Acceptance Scenarios**:

1. **Given** um pedido do Mercado Livre com rastreio já preenchido automaticamente, **When** a administradora edita o rastreio manualmente pelo admin, **Then** o valor editado prevalece imediatamente (mesmo campo, mesmo formulário de sempre — a automação não bloqueia nem esconde a edição manual).
2. **Given** um pedido com rastreio editado manualmente, **When** chega uma notificação `shipments` mais nova para o mesmo envio, **Then** o rastreio é atualizado para refletir o dado mais recente do Mercado Livre (mesma regra de "a notificação mais nova é a que vale" já usada nos demais webhooks — ver Assumptions).

---

### Edge Cases

- Notificação chega para um tópico ainda não assinado pela aplicação ou de uma aplicação diferente (`application_id` não corresponde) → ignorar, sem erro (mesmo padrão do webhook `orders_v2` atual).
- Notificação de envio referencia uma venda que ainda não existe como pedido no site (ex.: `orders_v2` ainda não processado) → ignorar essa notificação; o próximo evento de `shipments` (ou uma nova consulta futura) volta a tentar quando o pedido já existir.
- Consulta à API do Mercado Livre (detalhe do envio) falha temporariamente → o Mercado Livre reenvia a notificação depois; o endpoint responde com erro para não confirmar recebimento nesse caso (mesmo padrão do webhook `orders_v2`).
- Envio sem código de rastreio consultável (algumas modalidades do Mercado Envios não geram um código rastreável pelo comprador) → não sobrescreve o rastreio com um valor vazio; pedido segue disponível para preenchimento manual.
- Envio cancelado ou devolvido → não é tratado como "entregue"; o status do pedido não é atualizado automaticamente para esses casos (fora do escopo desta etapa — ver Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE assinar o tópico de notificação `shipments`, além dos tópicos já assinados (`orders_v2`, `questions`, `claims`, `claims_actions`, `messages`).
- **FR-002**: O sistema DEVE expor um endpoint de callback para o tópico `shipments`, que recebe o gatilho da notificação e busca o detalhe do envio na API do Mercado Livre.
- **FR-003**: O sistema DEVE validar o `application_id` da notificação recebida contra a aplicação configurada, ignorando notificações que não correspondam (mesmo padrão do webhook `orders_v2`).
- **FR-004**: O sistema DEVE resolver o pedido do site correspondente ao envio notificado, usando o mesmo vínculo de pedido externo já usado por `orders_v2` (`origemExterna.pedidoExternoId`).
- **FR-005**: Quando o envio tiver um código de rastreio disponível, o sistema DEVE preencher automaticamente `rastreio.codigo` e `rastreio.transportadora` do pedido correspondente.
- **FR-006**: O sistema DEVE atualizar o status do pedido para "enviado" quando o envio for despachado, e para "entregue" quando o envio for confirmado como entregue.
- **FR-007**: A administradora DEVE continuar podendo editar o rastreio manualmente pelo admin a qualquer momento, como hoje (Tarefa 10/EDI-84) — a automação preenche o mesmo campo, não um campo separado nem bloqueado.
- **FR-008**: Uma notificação `shipments` nova sempre reflete o estado mais atual do envio — o sistema DEVE aplicar o dado mais recente recebido, mesmo que substitua um valor preenchido manualmente antes (mesma regra de idempotência dos demais webhooks: a última notificação processada é a que vale).
- **FR-009**: Quando o envio notificado não tiver um pedido correspondente ainda registrado no site, o sistema DEVE ignorar a notificação sem erro (edge case acima).

### Key Entities *(include if feature involves data)*

- **Pedido (existente)**: ganha atualização automática dos campos já existentes `rastreio.codigo`, `rastreio.transportadora` e `status`, a partir do envio vinculado por `origemExterna.pedidoExternoId`. Nenhuma entidade nova.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um pedido do Mercado Livre despachado passa a mostrar o código de rastreio em "Meus Pedidos" em até 5 minutos após o despacho no Mercado Livre, sem ação manual.
- **SC-002**: Um pedido do Mercado Livre entregue passa a mostrar status "Entregue" em até 5 minutos após a confirmação de entrega no Mercado Livre.
- **SC-003**: A administradora consegue editar o rastreio de um pedido do Mercado Livre pelo admin a qualquer momento, exatamente como hoje.
- **SC-004**: A quantidade de pedidos do Mercado Livre com rastreio preenchido manualmente do zero cai para perto de zero após a entrada em produção (a automação passa a cobrir a maioria dos casos).

## Assumptions

- O envio precisa estar vinculado a um pedido já existente no site (criado pelo webhook `orders_v2`, EDI-80) — não há caso de um envio existir no site sem o pedido correspondente.
- Cancelamento/devolução de envio fica fora do escopo desta etapa — o status do pedido nesses casos continua sendo ajustado manualmente pela administradora, como hoje.
- "Transportadora" para envios via Mercado Envios (a grande maioria) é registrada como "Mercado Envios" — não há, hoje, necessidade de distinguir a transportadora física por trás da logística do Mercado Livre.
- Não há proteção especial contra "notificação atrasada sobrescrevendo edição manual" (FR-008) — mesma simplicidade já aceita pelo projeto para atualização de status manual (`atualizarStatusPedido`, sem validação de transição); se isso se mostrar um problema real em produção, vira um ajuste futuro, não bloqueia esta entrega.
