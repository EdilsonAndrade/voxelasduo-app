# Quickstart: Webhooks de perguntas e reclamações do Mercado Livre

## Configuração manual (fora do código)

1. Acessar "Minhas Aplicações" no Mercado Livre com a conta de desenvolvedor do projeto.
2. Na aplicação já usada pela integração (mesma de `orders_v2`), ativar os tópicos: `questions`, `claims`, `claims_actions`, `messages`.
3. Confirmar que a URL de callback configurada aponta para o domínio de produção do site (mesmo padrão de `orders_v2`).

## Rodando localmente

1. Variáveis de ambiente já existentes (`MERCADOLIVRE_CLIENT_ID` e demais usadas por `lib/estoque/canais/mercadoLivre/auth.ts`) precisam estar configuradas.
2. `npm run dev` (ou o script do projeto) para subir a aplicação.
3. Simular uma notificação localmente com `curl`, por exemplo:

```bash
curl -X POST http://localhost:3000/api/webhooks/mercado-livre/perguntas \
  -H "Content-Type: application/json" \
  -d '{"resource":"/questions/123456789","topic":"questions","application_id":"<MERCADOLIVRE_CLIENT_ID>"}'
```

4. Conferir no admin (`/admin/atendimento`) que o item aparece como pendente.

## Testes automatizados

```bash
npx vitest run lib/estoque/canais/mercadoLivre/perguntas.test.ts lib/estoque/canais/mercadoLivre/reclamacoes.test.ts lib/estoque/canais/mercadoLivre/mensagens.test.ts lib/atendimento
```
