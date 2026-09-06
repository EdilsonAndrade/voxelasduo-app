# Quickstart: Painel administrativo de pedidos

## Pré-requisitos

- Variáveis de ambiente do MongoDB já configuradas (mesmas das Tarefas 1-7).
- Ao menos um pedido criado pelo checkout do site (Tarefa 3) e, opcionalmente, um pedido sincronizado do Mercado Livre (Tarefa 7) para ver os dois canais reais na listagem.

## Fluxo manual

1. Acesse `/admin/pedidos`.
2. Confirme que a lista mostra pedidos do site e do Mercado Livre juntos, mais recentes primeiro, com canal, status, cliente e valor.
3. Use o filtro de canal e selecione "Shopee" — confirme que aparece a mensagem de integração pendente, sem erro.
4. Volte o filtro para "Todos" ou "Mercado Livre"/"Site" e use o filtro de status.
5. Abra o detalhe de um pedido e confira itens, cliente e dados de pagamento (quando existirem).
6. Em um pedido "pago", clique para marcar como "enviado", confirme no modal e veja o toast de sucesso e o novo status refletido na lista.

## Verificação de dados (opcional)

```js
// mongosh
use voxelasduo
db.pedidos.find({}, { canalOrigem: 1, status: 1, valorTotal: 1 }).sort({ criadoEm: -1 }).limit(5)
```
