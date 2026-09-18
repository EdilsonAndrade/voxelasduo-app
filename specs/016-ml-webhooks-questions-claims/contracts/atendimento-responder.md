# Contract: endpoints de ação do admin (responder pelo site)

Autenticados pela mesma sessão de admin já usada pelas demais rotas de `app/api/admin/*` (FR-010 a FR-012).

## `POST /api/admin/atendimento/perguntas/[id]/responder`

**Request body**: `{ "texto": string }` (1..2000 caracteres — limite da API do Mercado Livre, research.md #1)

**Comportamento**:
1. Busca a pergunta pendente em `perguntas_mercado_livre` pelo `id` (`_id` do Mongo).
2. Chama `responderPerguntaMercadoLivre(perguntaId, texto)` → `POST /answers` no Mercado Livre.
3. Sucesso → atualiza `status` para `respondida`, responde `200 { "ok": true }`.
4. Falha na API do Mercado Livre → mantém `pendente`, responde `502 { "erro": "..." }` (FR-015 — erro exibido para a administradora, item continua pendente para nova tentativa).

## `POST /api/admin/atendimento/reclamacoes/[id]/responder`

Mesmo contrato, chamando `responderReclamacaoMercadoLivre(reclamacaoId, texto)`.

## `POST /api/admin/atendimento/mensagens/[id]/responder`

Mesmo contrato, chamando `responderMensagemMercadoLivre(mensagemId, texto)`.

## Regra comum

- Em nenhum dos três casos o endpoint marca o item como resolvido sem confirmação de sucesso da API do Mercado Livre — evita item "desaparecer" da listagem sem a resposta ter sido de fato publicada (FR-015).
- O link para o portal do Mercado Livre (`linkOrigem`) continua sempre visível na listagem, independente do resultado da resposta pelo admin (FR-013).
