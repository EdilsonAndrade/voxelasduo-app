# Quickstart: EDI-132

1. `npm test` — despachante, verificação e rotas.
2. Após o deploy, no painel do MP (Webhooks → Modo de produção) configurar a URL `https://www.voxelasduo.com.br/api/notificacoes` com o evento **Pagamentos** (a URL do ML muda junto — é a mesma aplicação). Qualquer URL antiga também funciona.
3. Painel do MP → **Simular**: `data.id = 123456` → **200** (antes 500); `data.id` de um pagamento real → 200.
4. Simular aviso do ML (pedido) com curl:
   ```
   curl -X POST https://www.voxelasduo.com.br/api/notificacoes -H "Content-Type: application/json" \
     -d '{"resource":"/orders/<ORDER_ID>","topic":"orders_v2","application_id":<CLIENT_ID>}'
   ```
   → pedido do ML aparece em /admin/pedidos.
5. Admin → Pedidos → pedido do site pendente → "ver mais detalhes" → **Verificar pagamento no Mercado Pago**.
6. Cron: `curl -H "Authorization: Bearer <CRON_SECRET>" https://www.voxelasduo.com.br/api/pagamentos/conferir-pendentes`.
