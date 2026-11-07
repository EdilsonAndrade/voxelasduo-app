# Contracts: Produto com variações de kit

Todas as rotas `/api/produtos/*` de escrita exigem sessão de admin (middleware existente).

## PUT /api/produtos/[id]/variacoes
Substitui a lista inteira de variações.

Request:
```json
{ "variacoes": [
  { "id": "a1b2c3", "nome": "Kit 3 peças", "pecas": [{ "produtoId": "...", "quantidade": 1 }],
    "embalagemCentavos": 500, "preco": 5593, "precosCanais": { "shopee": 7990 },
    "estoque": 10, "foto": "https://..." }
] }
```
- `id` ausente = variação nova (o servidor gera).
- 200 `{ produto }`: produto com `variacoes`, `preco` e `estoque` derivados.
- 400 `{ erro: "Payload inválido.", campos: { "variacoes[0].nome": "..." } }`
- 404 `{ erro: "Produto não encontrado." }`

## PATCH /api/produtos/[id]/variacoes/[variacaoId]/precos
Aplica os preços vindos da calculadora.

Request: `{ "preco": 5593, "precosCanais": { "shopee": 7990, "mercadoLivre": 8500 } }`
- 200 `{ produto }`
- 400 preço inválido · 404 produto ou variação não encontrados

## POST /api/pedidos (existente)
`itens[]` aceita `variacaoId?: string`. Item de produto com variações sem `variacaoId` (ou com variação inexistente/sem estoque) → 409 de estoque, já existente, com `itens[]` problemáticos (`variacaoId` incluído).

## GET /admin/produtos/calculadora?produto=X&variacao=Y (página)
Abre o cálculo salvo da variação, se houver. Senão, inicia com o custo da variação e o preço da variação (Shopee ou site) como preço alvo. 404 se a variação não existir.
