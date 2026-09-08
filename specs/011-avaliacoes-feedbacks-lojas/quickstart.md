# Quickstart: Importação de Avaliações e Feedbacks das Lojas Parceiras

Pré-requisitos: autenticação OAuth2 do Mercado Livre já configurada (Tarefa 5/EDI-78 — `credenciaisCanais`), `MONGODB_URI` configurada. Shopee segue como stub até a aprovação do app (research.md #2) — nada a configurar por enquanto além de deixar `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY` ausentes.

## 1. Rodar a importação manualmente (sem esperar o cron)

```bash
curl -X POST https://<seu-deploy>/api/avaliacoes/importar \
  -H "Authorization: Bearer $CRON_SECRET"
```

Resposta esperada: `{ "produtosProcessados": N, "avaliacoesImportadas": X, "avaliacoesAtualizadas": Y, "falharam": Z }`.

## 2. Conferir avaliações importadas de um produto

```bash
curl https://<seu-deploy>/api/produtos/<produtoId>/avaliacoes
```

## 3. Conferir falhas de importação pendentes

```bash
curl https://<seu-deploy>/api/avaliacoes/pendencias
```

## 4. Ver a seção na página do produto

Acesse `/produtos/<categoria>/<slug>` de um produto com `integracoes.mercadoLivreId` preenchido e avaliações já importadas — a seção "avaliações de clientes" aparece abaixo da ficha técnica.
