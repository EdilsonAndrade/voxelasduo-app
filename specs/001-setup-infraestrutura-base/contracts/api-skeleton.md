# Contract: Esqueleto das rotas de domínio

`/api/produtos`, `/api/pedidos` e `/api/webhooks` são criadas nesta tarefa apenas como **esqueleto** (estrutura de pastas + handler mínimo), sem regra de negócio — o CRUD completo de produtos é escopo da Tarefa 2 (EDI-75), carrinho/checkout/pedidos da Tarefa 3-5 (EDI-76 a EDI-78), e webhooks de pagamento/marketplaces das Tarefas 4, 6 e 7 (EDI-77, EDI-79, EDI-80).

## `GET /api/produtos`

Handler mínimo que consulta a coleção `produtos` no MongoDB e retorna a lista (sem paginação, filtro ou busca nesta tarefa — isso é escopo da Tarefa 2).

**200 OK**:

```json
{ "produtos": [] }
```

Lista vazia é uma resposta válida enquanto não houver produtos cadastrados (Edge Case da spec).

## `GET /api/pedidos`

Handler mínimo que consulta a coleção `pedidos` e retorna a lista (sem regra de negócio de checkout/pagamento nesta tarefa).

**200 OK**:

```json
{ "pedidos": [] }
```

## `POST /api/webhooks`

Handler mínimo (placeholder) que apenas confirma que a rota existe e está pronta para receber payloads — a validação de assinatura e o processamento específico de cada provedor (Mercado Pago, Shopee, Mercado Livre) serão implementados nas tarefas correspondentes.

**200 OK**:

```json
{ "received": true }
```

## Fora de escopo nesta tarefa

- Autenticação/autorização das rotas.
- Validação de payload de negócio.
- Paginação, filtros e busca.
- Processamento real de webhooks.
