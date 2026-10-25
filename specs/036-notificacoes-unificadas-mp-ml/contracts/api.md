# Contracts: EDI-132

## POST /api/notificacoes  (pública — chamada pelo MP/ML)

Mesma resposta em `/api/pagamentos/webhook` e `/api/webhooks/mercado-livre/{pedidos,perguntas,reclamacoes,mensagens,envios}`.

| Situação | Status | Corpo |
|---|---|---|
| Processado / ignorado (tópico desconhecido, outra aplicação, sem pedido) | 200 | `{ "recebido": true }` |
| Pagamento inexistente no MP | 200 | `{ "recebido": true, "ignorado": "pagamento_nao_encontrado" }` |
| Assinatura do MP inválida | 401 | `{ "erro": "Assinatura inválida." }` |
| Falha transitória (MP/ML/banco) | 500 | `{ "erro": "Falha ao processar a notificação." }` |

## POST /api/pagamentos/verificar  (pública — tela do cliente; sem mudança de contrato)

Body `{ pedidoId }` → `{ pago: boolean, status? }` | 400 | 404 | 502.

## POST /api/pedidos/[id]/verificar-pagamento  (admin — sessão exigida pelo proxy)

200:
```json
{ "resultado": "pago" | "pendente" | "recusado" | "expirado" | "sem_tentativa" | "nao_encontrado" | "aprovado_pedido_cancelado",
  "mensagem": "texto pt-BR",
  "pedido": { "status": "pago" } }
```
404 pedido inexistente · 409 pedido não é do site · 502 `{ "erro": "...", "resultado": "falha" }` falha ao consultar o MP.

## GET|POST /api/pagamentos/conferir-pendentes  (cron — `Authorization: Bearer CRON_SECRET`)

200 `{ "conferidos": n, "pagos": n, "falhas": n }` · 401 sem segredo.
