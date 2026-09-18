# Quickstart: Rastreio automático via webhook de envios do Mercado Livre

## Configuração manual (fora do código)

1. Acessar "Minhas Aplicações" no Mercado Livre com a conta de desenvolvedor do projeto.
2. Na aplicação já usada pela integração, ativar o tópico `shipments`.

## Rodando localmente

1. Variáveis de ambiente já existentes (`MERCADOLIVRE_CLIENT_ID` e demais usadas por `lib/estoque/canais/mercadoLivre/auth.ts`) precisam estar configuradas.
2. `npm run dev` para subir a aplicação.
3. Simular uma notificação localmente com `curl`, usando o id de um envio real vinculado a um pedido já existente no site:

```bash
curl -X POST http://localhost:3000/api/webhooks/mercado-livre/envios \
  -H "Content-Type: application/json" \
  -d '{"resource":"/shipments/<id-real-de-um-envio>","topic":"shipments","application_id":"<MERCADOLIVRE_CLIENT_ID>"}'
```

4. Conferir no admin (`/admin/pedidos`) que o pedido vinculado passou a ter rastreio preenchido (e status atualizado, se o envio já estiver despachado/entregue).

## Testes automatizados

```bash
npx vitest run lib/estoque/canais/mercadoLivre/envios.test.ts app/api/webhooks/mercado-livre/envios
```
