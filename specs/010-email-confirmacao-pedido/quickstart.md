# Quickstart: E-mail de confirmação de pedido e padronização visual dos e-mails transacionais

## Pré-requisitos

- Variáveis já configuradas na Tarefa 10/EDI-84: `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICACAO_EMAIL`.
- Nova variável (esta tarefa): `SITE_URL` (ex.: `https://voxelasduo.com`, ou a URL do preview da Vercel) — usada para montar o link absoluto da logo nos e-mails. Sem ela, cai para `VERCEL_URL` (automática na Vercel); em `localhost` sem nenhuma das duas, o e-mail é enviado sem a imagem da logo.

## Testar localmente (unitário, sem enviar e-mail de verdade)

```bash
npx vitest run lib/email/resend.test.ts lib/email/templates.test.ts lib/pagamentos/repository.test.ts
```

## Fluxo ponta a ponta (ver seção "Test Guide" ao final da implementação)

Não suba o site/servidor localmente para testar — siga o guia de teste manual fornecido ao final da implementação (checkout real com cartão de teste aprovado do Mercado Pago, verificação do e-mail recebido).
