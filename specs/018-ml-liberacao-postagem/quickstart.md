# Quickstart: Aviso de venda aguardando liberação para postagem (Mercado Livre)

Não exige nenhuma configuração manual nova — reaproveita o tópico `shipments` já ativado no EDI-101.

## Rodando localmente

1. `npm run dev`.
2. Simular uma notificação de um envio em `buffered`, usando o id de um envio real nesse estado (ex.: uma venda afetada pela greve dos Correios):

```bash
curl -X POST http://localhost:3000/api/webhooks/mercado-livre/envios \
  -H "Content-Type: application/json" \
  -d '{"resource":"/shipments/<id-real-em-buffered>","topic":"shipments","application_id":"<MERCADOLIVRE_CLIENT_ID>"}'
```

3. Acessar `/admin/pedidos` e conferir que o pedido correspondente mostra o aviso "aguardando liberação — libera em DD/MM".
4. Quando o mesmo envio evoluir para `shipped` (fluxo já validado no EDI-101), reenviar a notificação e conferir que o aviso desaparece.

## Testes automatizados

```bash
npx vitest run lib/estoque/canais/mercadoLivre/envios.test.ts app/api/webhooks/mercado-livre/envios
```
