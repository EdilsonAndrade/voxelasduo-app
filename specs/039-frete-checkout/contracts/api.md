# API Contracts: Frete no checkout

## POST /api/frete (público)
Opções de entrega para o checkout.

Request:
```json
{ "cep": "01001000", "itens": [{ "produtoId": "…", "quantidade": 2 }] }
```
`cep` e `itens` são opcionais hoje; entram na conta quando houver calculadora.

200:
```json
{ "opcoes": [
  { "servico": "pac", "rotulo": "PAC", "valorCentavos": 1990, "origem": "fixo" },
  { "servico": "sedex", "rotulo": "SEDEX", "valorCentavos": 2550, "origem": "fixo" },
  { "servico": "combinar", "rotulo": "Combinar com a loja", "valorCentavos": 0, "origem": "gratis" }
] }
```

## POST /api/pedidos (alterado)
Novo campo obrigatório no corpo:
```json
{ "frete": { "servico": "sedex", "valorCentavos": 2550 } }
```
- 400 `{ "erro": "Dados inválidos.", "campos": { "frete": "Escolha a forma de entrega." } }`: serviço ausente ou inválido.
- 409 `{ "erro": "O valor do frete mudou. Confira a nova opção antes de confirmar.", "codigo": "frete_divergente", "opcoes": [ …OpcaoFrete ] }`: valor exibido diferente do vigente.
- 409 de estoque: inalterado (`{ erro, itens }`).
- 201/200: `pedido.valorTotal` já inclui o frete; `pedido.frete` é devolvido.

## GET /api/admin/configuracoes/frete (admin)
200: `{ "pacCentavos": 1990, "sedexCentavos": 2550 }`

## PUT /api/admin/configuracoes/frete (admin)
Request: `{ "pacCentavos": 1990, "sedexCentavos": 2800 }`
- 200: config salva.
- 400 `{ "erro": "Payload inválido.", "campos": { "sedexCentavos": "…" } }`

## GET /api/pedidos/[id] (inalterado na forma)
`PedidoDetalhado` e `PedidoResumo` ganham `frete?: FretePedido`.
