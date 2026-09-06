# Contracts: API do painel administrativo de pedidos

## `GET /api/pedidos`

Estende a rota já existente (Tarefa 1). Todos os query params são opcionais.

**Query params**:
- `canal`: `"site" | "shopee" | "mercado_livre"`
- `status`: `"pendente" | "pago" | "enviado" | "cancelado"`
- `pagina`: inteiro ≥ 1 (default `1`), 20 itens por página

**200 OK**:
```json
{
  "pedidos": [
    {
      "id": "string",
      "canalOrigem": "site | shopee | mercado_livre",
      "status": "pendente | pago | enviado | cancelado",
      "cliente": { "nome": "string", "email": "string" },
      "valorTotal": 12345,
      "criadoEm": "2026-09-06T12:00:00.000Z",
      "temItemSemCorrespondencia": false
    }
  ],
  "totalPaginas": 1,
  "paginaAtual": 1
}
```

- `canal=shopee` sempre retorna `pedidos: []` (nenhuma integração real ainda — ver research.md #3), sem erro.
- Nenhum parâmetro desconhecido/inválido derruba a rota — valores fora do enum são ignorados (comportamento equivalente a "sem filtro" nesse campo).

## `GET /api/pedidos/[id]`

**Uso**: detalhe de um pedido para o painel (itens, cliente, pagamento).

**200 OK**:
```json
{
  "pedido": {
    "id": "string",
    "canalOrigem": "site | shopee | mercado_livre",
    "status": "pendente | pago | enviado | cancelado",
    "cliente": { "nome": "string", "email": "string", "telefone": "string", "endereco": { "...": "..." } },
    "itens": [
      { "produtoId": "string | null", "nome": "string", "quantidade": 1, "precoUnitario": 12345, "semCorrespondencia": false }
    ],
    "valorTotal": 12345,
    "pagamento": { "metodo": "string", "status": "aprovado", "referenciaExterna": "string" },
    "origemExterna": { "canal": "mercado_livre", "pedidoExternoId": "string" },
    "criadoEm": "2026-09-06T12:00:00.000Z",
    "atualizadoEm": "2026-09-06T12:00:00.000Z"
  }
}
```

**404 Not Found**: `{ "erro": "Pedido não encontrado." }` quando o `id` não existe.

## `PATCH /api/pedidos/[id]`

**Body**:
```json
{ "status": "pendente | pago | enviado | cancelado" }
```

**200 OK**:
```json
{ "pedido": { "id": "string", "status": "enviado", "atualizadoEm": "2026-09-06T12:05:00.000Z" } }
```

**400 Bad Request**: `{ "erro": "Status inválido." }` quando `status` não é um dos quatro valores do enum.

**404 Not Found**: `{ "erro": "Pedido não encontrado." }` quando o `id` não existe.

Sem validação de transição de estado (ver research.md #2) — qualquer valor válido do enum é aceito a partir de qualquer status atual.
