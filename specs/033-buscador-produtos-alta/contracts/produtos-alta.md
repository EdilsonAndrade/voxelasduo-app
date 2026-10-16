# Contrato: rotas do buscador de produtos em alta

Todas sob `/api/admin/*` (protegidas pelo `proxy.ts`). Erros: `{ erro, mensagem, statusOrigem? }` com status real (nunca 200).

## GET /api/admin/produtos-alta/lista
Query: `categoria` (id de uma das 16 ou descendente), `ordem` (`vendidos` | `procurados`), `forcar` (`true` ignora o cache).

200:
```json
{
  "categoriaId": "MLB186368", "categoriaNome": "Suportes para Papel Higiênico",
  "origem": "cache", "obtidoEm": "2026-10-15T18:00:00.000Z", "avisoDesatualizado": false,
  "itens": [ {
    "chave": "PRODUCT:MLB19590092", "origem": "vendido", "posicao": 1,
    "nome": "Porta Papel Higiênico Inox Adesivo 3M", "foto": "https://http2.mlstatic.com/...jpg",
    "categoriaId": "MLB186368", "categoriaNome": "Suportes para Papel Higiênico",
    "links": { "mercadoLivre": "https://www.mercadolivre.com.br/p/MLB19590092",
               "shopee": "https://shopee.com.br/search?keyword=...", "makerworld": "https://makerworld.com/pt/search/models?keyword=..." } } ]
}
```
Erros: 400 `categoria_invalida` | `ordem_invalida`; 401 `token_invalido`; 429 `limite_mercado_livre`; 502 `falha_mercado_livre`.

## GET /api/admin/produtos-alta/busca
Query: `termo` (obrigatório), `categoria` (opcional; ausente = catálogo todo), `forcar`.

200: `{ termo, categoriaId?, origem, obtidoEm, avisoDesatualizado, itens: ItemEmAlta[] }` (até 24, `posicao: null`, `origem: "busca"`).
Erros: 400 `termo_invalido` | `categoria_invalida`; 401; 429; 502.

## GET /api/admin/produtos-alta/categoria
Query: `id`. 200: `CategoriaNavegavel` (`{ id, nome, caminho, filhas }`). Cache de 7 dias.
Erros: 400 `categoria_invalida`; 401; 502.
