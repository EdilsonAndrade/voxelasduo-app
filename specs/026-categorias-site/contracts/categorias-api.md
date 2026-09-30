# Contract: Categorias do site (EDI-123)

Todas as rotas `/api/admin/*` e `/api/produtos/*` já exigem uma sessão admin (`lib/auth/rotaProtegida.ts`). Sem sessão, a resposta é `401 {erro}`.
Os erros sempre retornam o status HTTP real, com o corpo `{ erro: string, campos?: Record<string,string> }`.

## GET /api/admin/categorias
`200 { categorias: Array<{ _id, nome, slug, ordem, padrao?, totalProdutos: number }> }`, ordenadas por `ordem`.

## POST /api/admin/categorias
Body `{ nome: string }`
- `201 { categoria }`
- `400 { erro, campos: { nome } }`: nome vazio, só com símbolos ou com mais de 60 caracteres
- `409 { erro: "Já existe uma categoria equivalente: \"Acessórios\"." }`

## PATCH /api/admin/categorias/[id]
Body `{ nome: string }` (renomeia; o slug não muda)
- `200 { categoria }` · `400` · `404` · `409` (equivalente a outra)

## PUT /api/admin/categorias/ordem
Body `{ ids: string[] }` (todos os ids, na nova ordem)
- `204` · `400` (lista incompleta, repetida ou com id inválido)

## DELETE /api/admin/categorias/[id]
- `200 { produtosMovidos: number }`: produtos movidos para Diversos, slug e aliases transferidos
- `403 { erro: "A categoria Diversos não pode ser removida." }` · `404`

## PATCH /api/produtos/[id] (existente, comportamento alterado)
- `categoria` deve ser o slug de uma categoria cadastrada. Caso contrário, `400 { campos: { categoria } }`.
- Quando `categoria` ou `slug` mudam: resolve o conflito de slug no destino, grava `redirecionamentosProdutos` e revalida `/` e `/produtos`.
- Usado também pela troca rápida na listagem: body `{ categoria: "religioso" }` → `200 { produto }`.

## POST /api/produtos (existente, comportamento alterado)
- `categoria` ausente ou vazia significa `diversos`. Um slug inexistente retorna `400`.

## Rotas públicas (comportamento alterado)
| Requisição | Resultado |
|---|---|
| `GET /produtos` | filtros = categorias cadastradas com ≥ 1 produto, por `ordem`, exibindo `nome` |
| `GET /produtos/{slugCategoria}` | lista a categoria; título = `nome` |
| `GET /produtos/{aliasOuVariação}` | `308` → `/produtos/{slugAtual}` |
| `GET /produtos/{inexistente}` | `404` |
| `GET /produtos/{cat}/{slug}` existente | página do produto (breadcrumb e ficha exibem `nome` da categoria) |
| `GET /produtos/{catAntiga}/{slugAntigo}` com redirecionamento | `308` → URL atual do produto |
