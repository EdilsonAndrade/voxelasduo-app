# API: Tempo de Impressão

Todas protegidas pelo proxy `/api/admin/*` (401 sem sessão). Erros: `{ "erro": string }` com status real (400/404/500).

Item no corpo: `{ "id"?: string, "nome": string, "minutos": number, "inicio"?: "HH:MM" | "" }`.

## GET /api/admin/tempo-impressao

200 → `{ "planos": [{ "produtoId", "produtoNome", "itens": Item[], "atualizadoEm" }] }` (planos de produtos inexistentes ficam de fora; ordem: atualizado mais recente primeiro).

## POST /api/admin/tempo-impressao

Corpo: `{ "produtoId": string, "itens": Item[], "modo"?: "criar" | "mesclar" }`

- `criar` (padrão): 201 com o plano novo; se o produto já está no menu → 409 `{ erro, produtoId }`.
- `mesclar`: cria se não existe (201) ou mescla pelo nome (200).
- 400 itens inválidos; 404 produto inexistente.

Resposta: `{ "plano": Plano }`.

## PUT /api/admin/tempo-impressao/[produtoId]

Corpo: `{ "itens": Item[] }` — substitui a lista (edição, remoção de linhas). 200 `{ plano }`; 400 inválido (ex.: lista vazia, tempo ≤ 0, nome repetido); 404 plano inexistente.

## DELETE /api/admin/tempo-impressao/[produtoId]

200 `{ "ok": true }`; 404 plano inexistente. Não altera o produto do catálogo.

## Páginas

- `/admin/tempo-impressao` — tela de planejamento.
- `/admin/tempo-impressao/imprimir` — ficha em lista para imprimir/salvar PDF.
