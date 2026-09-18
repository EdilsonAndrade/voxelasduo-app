# Contract: extensão do endpoint de callback `shipments` (EDI-101)

Mesmo endpoint `POST /api/webhooks/mercado-livre/envios` (contracts/webhook-shipments.md do EDI-101) — nenhum endpoint novo.

## Comportamento adicional

Após buscar o detalhe do envio (`buscarEnvioMercadoLivre`, agora também retornando `aguardandoLiberacaoAte?: Date`) e resolver o pedido:

1. Substatus `buffered` com data de liberação disponível → chama `atualizarAguardandoLiberacaoPedido(pedidoId, data)`.
2. Qualquer outro substatus → chama `atualizarAguardandoLiberacaoPedido(pedidoId, null)` (limpa o campo, research.md #3), exceto quando o pedido já não tinha o campo preenchido (evita `updateOne` desnecessário — otimização opcional, não obrigatória).
3. Sem mudança no contrato de resposta HTTP (200/500) já documentado no EDI-101.
