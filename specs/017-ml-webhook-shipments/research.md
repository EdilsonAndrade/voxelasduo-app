# Research: Rastreio automático via webhook de envios do Mercado Livre

## 1. Vincular o envio (shipment) ao pedido

- **Decision**: Buscar o detalhe do envio via `GET /shipments/{id}` (status, `substatus`, `tracking_number`) e, separadamente, o `order_id` via `GET /shipments/{id}/items` (retorna os itens do envio, cada um com `order_id`).
- **Rationale**: A partir de 12/10/2025 o Mercado Livre descontinuou os campos `order_id`/`external_reference` na resposta de `GET /shipments/{id}` (passou a exigir o header `x-format-new: true` e mudou o formato) — não dá mais para confiar nesse campo diretamente na resposta do envio. `GET /shipments/{id}/items` continua retornando `order_id` por item.
- **Alternatives considered**: Usar `GET /orders/{id}/shipments` — não serve aqui, pois o webhook entrega o `shipment_id`, não o `order_id` (é o sentido contrário da consulta).
- **Nota de implementação**: Como a doc oficial bloqueou fetch automatizado durante esta pesquisa (mesma limitação já registrada em EDI-98/research.md #2), vale validar o formato exato de `GET /shipments/{id}/items` contra um envio de teste antes de considerar a Tarefa concluída.

## 2. Mapear status do envio para status do pedido

- **Decision**: Mapear `status` do envio do Mercado Livre para o `StatusPedido` do site apenas nos dois casos citados no spec (FR-006): `shipped` → `enviado`; `delivered` → `entregue`. Qualquer outro `status`/`substatus` (ex.: `pending`, `handling`, `ready_to_ship`, `not_delivered`, `cancelled`) não altera o status do pedido nesta etapa (Assumptions do spec.md — cancelamento/devolução fica fora de escopo).
- **Rationale**: Cobre exatamente os dois eventos que o ticket pede (rastreio disponível = despachado; entrega confirmada), sem tentar mapear todo o ciclo de vida do envio (que tem bem mais estados do que o `StatusPedido` do site modela hoje).
- **Alternatives considered**: Mapear todos os `status`/`substatus` do Mercado Envios para o enum do site — rejeitado por exigir expandir `StatusPedido` (`cancelado_pelo_comprador`, `devolvido`, etc.) sem necessidade comprovada pelo ticket.

## 3. Transportadora

- **Decision**: Gravar `rastreio.transportadora` sempre como `"Mercado Envios"` quando o envio vem do Mercado Livre.
- **Rationale**: A esmagadora maioria dos envios do Mercado Livre usa a logística própria (Mercado Envios); a API não expõe de forma simples uma "transportadora física" diferente disso para o vendedor consultar por item.
- **Alternatives considered**: Tentar mapear `logistic_type` (`drop_off`, `cross_docking`, `fulfillment`, etc.) para nomes de transportadora — rejeitado, não é isso que o campo representa (é o modo logístico, não uma transportadora).

## 4. Idempotência

- **Decision**: A atualização é sempre um `$set` direto (via `atualizarRastreioPedido`/`atualizarStatusPedido` já existentes) sobre o pedido já encontrado por `origemExterna.pedidoExternoId` — sem necessidade do padrão de índice único + retry usado em `upsertPedidoExterno` (aqui não criamos documento novo, só atualizamos um já existente).
- **Rationale**: `Pedido` já existe (criado por `orders_v2`) antes de qualquer notificação de `shipments` fazer sentido; atualizar um documento existente por `_id` é uma operação naturalmente idempotente (reenvio da mesma notificação só reaplica o mesmo `$set`).
- **Alternatives considered**: Nenhuma — não há criação de documento nesta feature, então o padrão de idempotência de criação (EDI-98/EDI-80) não se aplica.

## 5. Contrato de resposta do endpoint de callback

- **Decision**: Mesmo contrato dos demais webhooks — `200` sempre que a notificação foi recebida e tratada (inclusive quando ignorada por falta de pedido correspondente, FR-009), `500` só em falha transitória ao consultar a API do Mercado Livre.
- **Rationale**: Consistência com `orders_v2`/EDI-98 — o Mercado Livre reenvia automaticamente em caso de erro.
