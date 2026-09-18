# Contract: endpoints de callback do Mercado Livre

Mesmo contrato do webhook `orders_v2` já existente (`app/api/webhooks/mercado-livre/pedidos/route.ts`).

## `POST /api/webhooks/mercado-livre/perguntas`

**Request body** (enviado pelo Mercado Livre — tópico `questions`):

```json
{ "resource": "/questions/123456789", "user_id": 1, "topic": "questions", "application_id": 1, "attempts": 1, "sent": "...", "received": "..." }
```

**Comportamento**:
1. Ignora se `application_id` não corresponder a `MERCADOLIVRE_CLIENT_ID` → `200 { "recebido": true }`.
2. Extrai o id da pergunta de `resource`; busca detalhe via `GET /questions/{id}` (`buscarPerguntaMercadoLivre`).
3. Faz upsert idempotente em `perguntas_mercado_livre` (status `pendente` se ainda sem resposta, `respondida` se a notificação já reflete resposta).
4. Falha transitória na consulta ao ML → `500`, sem persistir (Mercado Livre reenvia).
5. Sucesso → `200 { "recebido": true }`.

## `POST /api/webhooks/mercado-livre/reclamacoes`

Mesmo fluxo, para os tópicos `claims`/`claims_actions`, usando `GET /post-purchase/v1/claims/{claim_id}` (`buscarReclamacaoMercadoLivre`) e upsert em `reclamacoes_mercado_livre`.

## `POST /api/webhooks/mercado-livre/mensagens`

Mesmo fluxo, para o tópico `messages`, usando `GET /messages/packs/{pack_id}/sellers/{seller_id}` (`buscarMensagemMercadoLivre`) e upsert em `mensagens_mercado_livre`.

## Regra comum

- Sempre `200` para confirmar recebimento, exceto falha transitória na consulta ao Mercado Livre (`500`, para reenvio) — research.md #5.
- Nunca duplica item já persistido (idempotência por índice único no id de origem) — research.md #4.
