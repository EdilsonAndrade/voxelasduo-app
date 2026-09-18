# Data Model: Aviso de venda aguardando liberação para postagem (Mercado Livre)

## `Pedido` (alterado)

| Campo | Tipo | Notas |
|---|---|---|
| `envioAguardandoLiberacaoAte` | `Date?` | Novo. Presente quando o envio do Mercado Livre está com substatus `buffered` (research.md #1) — data em que a etiqueta poderá ser impressa, quando informada pelo Mercado Livre. `undefined` quando não aplicável ou quando o envio sai desse estado (research.md #3). |

Sem novo índice — não é usado em filtro/busca, só exibido junto do pedido já carregado.

## `PedidoResumo` / `PedidoDetalhado` (`lib/pedidos/apresentacao.ts`, alterados)

Ambos passam a expor `envioAguardandoLiberacaoAte?: Date`, repassado direto de `Pedido` (mesmo padrão de `rastreio` já exposto hoje).
