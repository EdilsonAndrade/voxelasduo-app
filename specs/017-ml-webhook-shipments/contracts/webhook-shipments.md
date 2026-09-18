# Contract: endpoint de callback `shipments`

Mesmo contrato dos demais webhooks já existentes (`app/api/webhooks/mercado-livre/pedidos/route.ts`, EDI-98).

## `POST /api/webhooks/mercado-livre/envios`

**Request body** (enviado pelo Mercado Livre — tópico `shipments`):

```json
{ "resource": "/shipments/123456789", "user_id": 1, "topic": "shipments", "application_id": 1, "attempts": 1, "sent": "...", "received": "..." }
```

**Comportamento**:
1. Ignora se `application_id` não corresponder a `MERCADOLIVRE_CLIENT_ID` → `200 { "recebido": true }`.
2. Extrai o id do envio de `resource`; busca detalhe via `GET /shipments/{id}` + `GET /shipments/{id}/items` (`buscarEnvioMercadoLivre`, research.md #1).
3. Resolve o pedido do site via `buscarPedidoPorOrigemExterna(orderId)`. Sem pedido correspondente → `200 { "recebido": true }` (FR-009), nada é persistido.
4. Com pedido encontrado: chama `atualizarRastreioPedido` quando houver `tracking_number` (FR-005) e `atualizarStatusPedido` quando o status mapear para `"enviado"`/`"entregue"` (FR-006, research.md #2).
5. Falha transitória na consulta ao Mercado Livre → `500`, sem persistir (Mercado Livre reenvia).
6. Sucesso → `200 { "recebido": true }`.
