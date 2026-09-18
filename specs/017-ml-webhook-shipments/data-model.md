# Data Model: Rastreio automático via webhook de envios do Mercado Livre

Sem entidade nova e sem mudança de schema. A feature só passa a escrever, de forma automática, em campos que já existem em `Pedido` (`lib/models/pedido.ts`):

| Campo | Já existe? | Quem escreve agora |
|---|---|---|
| `rastreio.codigo` | Sim (Tarefa 10/EDI-84) | Manualmente (admin) **e**, a partir desta feature, automaticamente pelo webhook `shipments` |
| `rastreio.transportadora` | Sim | Idem — sempre `"Mercado Envios"` quando preenchido automaticamente (research.md #3) |
| `status` | Sim | Manualmente (admin) **e**, a partir desta feature, automaticamente para `"enviado"`/`"entregue"` (research.md #2) |

## Vínculo usado

`Pedido.origemExterna.pedidoExternoId` (já existe, mesmo campo usado por `orders_v2`) é resolvido a partir do `order_id` obtido em `GET /shipments/{id}/items` (research.md #1).

## Nova função de repositório

- `buscarPedidoPorOrigemExterna(pedidoExternoId: string): Promise<Pedido | null>` em `lib/pedidos/repository.ts`, ao lado de `buscarPedidoPorId`/`buscarPedidoPorIdempotencia` já existentes — único código novo de acesso a dados desta feature.
