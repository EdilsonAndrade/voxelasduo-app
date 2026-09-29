# Contrato: API de seções da home (admin)

Todas as rotas exigem sessão de admin (`proxy.ts`, prefixo `/api/admin/`) e retornam `401 { erro }` sem sessão. Toda rota de escrita chama `revalidatePath("/")`.
Erros: `400 { erro, campos? }` para validação, `404 { erro }` para seção ou produto inexistente, `500` sem tratamento especial (visível na aba Network).

| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/api/admin/home/secoes` | — | `200 { secoes: SecaoHome[] }` ordenadas por `ordem` |
| POST | `/api/admin/home/secoes` | `SecaoHomePayload` (com `tipo`) | `201 { secao }` |
| GET | `/api/admin/home/secoes/:id` | — | `200 { secao }` |
| PUT | `/api/admin/home/secoes/:id` | `SecaoHomePayload` parcial (o `tipo` não muda) | `200 { secao }` |
| DELETE | `/api/admin/home/secoes/:id` | — | `204` |
| PUT | `/api/admin/home/secoes/ordem` | `{ ids: string[] }`, todos os ids existentes e sem repetição | `200 { secoes }` |
| PUT | `/api/admin/home/secoes/:id/produtos` | `{ produtoIds: string[] }`, só para carrossel | `200 { secao }` |
| POST | `/api/admin/home/secoes/:id/produtos/:produtoId` | — | `200 { secao }` (idempotente) |
| DELETE | `/api/admin/home/secoes/:id/produtos/:produtoId` | — | `200 { secao }` (idempotente) |
| POST | `/api/admin/home/upload` | `multipart` com o campo `arquivo` (JPEG/PNG/WebP, ≤ 5MB) | `200 { url }` · `400 { erro }` |

## Validação (`lib/home/validation.ts`)
- `tipo` ∈ os 4 tipos. Id inválido (ObjectId malformado) → 404.
- Tamanho máximo dos textos conforme data-model. Strings só com espaço viram ausentes.
- `botao`: se `texto` ou `link` vier preenchido, os dois são obrigatórios.
- Link válido: `^/(?!/)` ou `^https://`.
- `ativa: true` em banner sem `imagemDesktop` → `400 { campos: { imagemDesktop } }`.
- `limite` inteiro de 4 a 24.
- Rotas `/produtos` em seção que não é carrossel → 400. Produto inexistente → 404.

## Página pública
`GET /` renderiza as seções ativas. Sem nenhuma seção renderizável → `307` para `/produtos` (comportamento atual).
