# Contrato: API de pedidos de evento

Todas as rotas exigem sessão do admin (papel `admin` ou `equipe`). Sem sessão → `401 { erro }`. Com papel não permitido → `403 { erro }`.

## GET /api/admin/evento/pedidos
Query: `busca?` (nome ou dígitos do telefone), `evento?` (eventoId).
`200 { pedidos: PedidoEvento[] }`, do mais recente para o mais antigo, com no máximo 300.

## PUT /api/admin/evento/pedidos/[id]
`id` = UUID v4 (inválido → `400`).
Corpo:
```json
{
  "evento": "Feira de Sábado",
  "cliente": { "nome": "Ana", "telefone": "(19) 98342-3586" },
  "itens": [{ "id": "uuid", "descricao": "Chaveiro gato", "quantidade": 2, "fotos": ["https://…blob…/eventos/x.jpg"] }],
  "valorCentavos": 3000,
  "observacao": "rosa e roxo",
  "status": "anotado",
  "criadoEm": "2026-10-04T13:20:00.000Z"
}
```
- `201 { pedido }` quando cria; `200 { pedido }` quando atualiza (reenvio do mesmo id = atualização, sem duplicar).
- `400 { erros: { campo: mensagem } }` em erro de validação. As chaves seguem `evento`, `cliente.nome`, `cliente.telefone`, `itens`, `itens.<i>`, `itens.<i>.quantidade`, `valorCentavos`, `observacao`, `status`.
- As URLs de foto precisam ser do Blob da loja (`*.public.blob.vercel-storage.com`); senão → `400`.
- `criadoPor` é definido no primeiro gravação com o usuário da sessão; `atualizadoPor` em toda gravação.

## POST /api/admin/evento/fotos
`multipart/form-data`, campo `foto` (JPEG/PNG/WebP, ≤ 5 MB).
`201 { url }` · `400 { erro }` (sem arquivo ou formato/tamanho inválido) · `502 { erro }` (falha no Blob).

## GET /api/admin/evento/eventos
`200 { eventos: { id, nome }[] }`, pelo uso mais recente.

## Login
Usa o `/api/auth/*` do NextAuth do admin (provider `credentials`, campos `email` = usuário ou e-mail, `senha`). Depois de 10 falhas em 15 min para o mesmo identificador, o login é recusado até a janela expirar.
