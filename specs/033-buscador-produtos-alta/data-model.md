# Data Model: Buscador de produtos em alta (EDI-130)

Tipos em `lib/models/produtosAlta.ts`. Nada novo no banco além de chaves na coleção existente `trend_cache`.

## ItemEmAlta (card)

| Campo | Tipo | Regra |
|---|---|---|
| `chave` | string | `PRODUCT:MLB123`, `TERMO:<termo normalizado>` — usada para tirar repetidos no "Todas" |
| `origem` | `"vendido" \| "procurado" \| "busca"` | |
| `posicao` | number \| null | 1-based; `null` na busca por nome |
| `nome` | string \| undefined | nome do produto ou o termo; ausente em `ITEM`/`USER_PRODUCT` |
| `termo` | string \| undefined | só em `procurado` |
| `foto` | string \| undefined | URL https do ML; ausente → imagem substituta |
| `categoriaId` / `categoriaNome` | string | categoria em que apareceu |
| `links.mercadoLivre` | string | sempre presente (research #2) |
| `links.shopee` / `links.makerworld` | string \| undefined | ausentes quando não há `nome` |

## CategoriaNavegavel

| Campo | Tipo |
|---|---|
| `id`, `nome` | string |
| `caminho` | `{ id, nome }[]` — de `path_from_root`, para o breadcrumb |
| `filhas` | `{ id, nome }[]` — `children_categories` |

Validação: só aceita categoria que é uma das 16 de `CATEGORIAS_NICHO` **ou** descende de uma delas (`caminho` contém o id) → senão 400 `categoria_invalida`.

## Documentos em `trend_cache`

| `_id` | Conteúdo | TTL |
|---|---|---|
| `alta:vendidos:<catId>` | `{ tipo: "alta", itens: ItemEmAlta[] }` | 24h |
| `alta:procurados:<catId>` | idem | 24h |
| `alta:busca:<catId\|todas>:<termo>` | idem | 24h |
| `alta:produto:<id>` | `{ nome, foto }` | 7 dias |
| `alta:categoria:<id>` | `CategoriaNavegavel` | 7 dias |

`ItemRankingCategoria` (existente) ganha `foto?: string`.
