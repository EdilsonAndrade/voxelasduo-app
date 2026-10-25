# Implementation Plan: Notificações unificadas Mercado Pago + Mercado Livre

**Branch**: `edilsonaandrade/edi-132-notificacoes-unificadas-mercado-pago-mercado-livre-e` (EDI-132) | **Date**: 2026-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/036-notificacoes-unificadas-mp-ml/spec.md`

## Summary

Um **despachante de notificações** (`lib/notificacoes/despachante.ts`) identifica se o aviso é do Mercado Pago (pagamento, formatos Webhook/IPN) ou do Mercado Livre (`orders_v2`, `questions`, `claims`, `messages`, `shipments`) e chama o processador do tópico. Os processadores são a lógica que hoje está dentro de cada `route.ts` (movida para `lib/notificacoes/`). Uma rota nova `/api/notificacoes` e **todas** as rotas antigas (`/api/pagamentos/webhook`, `/api/webhooks/mercado-livre/*`) passam a chamar o mesmo despachante, então qualquer URL do painel funciona.

A verificação de pagamento vira uma função única (`verificarPagamentoPedido`) usada pela tela do cliente (`/api/pagamentos/verificar`), pelo botão do admin (`POST /api/pedidos/[id]/verificar-pagamento`), pela conferência ao abrir `/admin/pedidos` e pelo cron diário (`/api/pagamentos/conferir-pendentes`). Resultados não aprovados gravam `pagamento.ultimaFalha` no pedido, exibido no admin.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), SDK `mercadopago` (já instalado; `MPNotFoundError`, `WebhookSignatureValidator`), MongoDB driver — nenhuma dependência nova
**Storage**: MongoDB, coleção `pedidos` — campo novo opcional `pagamento.ultimaFalha`
**Testing**: Vitest — despachante (identificação de tópico), verificação de pagamento e rotas com módulos mockados; testes existentes das rotas do ML continuam passando
**Target Platform**: Vercel (Hobby — cron diário)
**Project Type**: web (Next.js monolito)
**Performance Goals**: lista de pedidos não espera mais que ~4s pela conferência automática
**Constraints**: erros com status real na aba Network e no log; sem subir servidor; sem commit
**Scale/Scope**: poucos pedidos pendentes/dia; conferência limitada a 20 pedidos dos últimos 7 dias

## Constitution Check

`.specify/memory/constitution.md` ainda é o template, sem gates formais. Regras do `CLAUDE.md`: erros visíveis na Network/log (FR-006), textos pt-BR inline (projeto sem lib de i18n — research #8), sem subir servidor, sem commit, branch com o nome da issue. Mudança visual mínima (botão + aviso no detalhe já existente), sem tela nova. ✅ Reavaliado após o design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/036-notificacoes-unificadas-mp-ml/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/notificacoes/identificar.ts (+ .test.ts)       # pura: identifica origem/tópico/id a partir de query + corpo
lib/notificacoes/despachante.ts (+ .test.ts)       # lê request, valida assinatura MP, chama processador, loga
lib/notificacoes/pagamento.ts                      # processador MP (ex-corpo de app/api/pagamentos/webhook)
lib/notificacoes/mercadoLivre/pedidos.ts           # ex-corpo das rotas do ML (sem mudança de lógica)
lib/notificacoes/mercadoLivre/perguntas.ts
lib/notificacoes/mercadoLivre/reclamacoes.ts
lib/notificacoes/mercadoLivre/mensagens.ts
lib/notificacoes/mercadoLivre/envios.ts
app/api/notificacoes/route.ts                      # endereço único novo
app/api/pagamentos/webhook/route.ts                # → despachante
app/api/webhooks/mercado-livre/*/route.ts          # → despachante (tópico padrão por rota)

lib/pagamentos/verificacao.ts (+ .test.ts)         # verificarPagamentoPedido, conferirPendentesRecentes
lib/pagamentos/repository.ts                       # registrarFalhaPagamento; promover limpa ultimaFalha e não reativa cancelado
lib/models/pedido.ts                               # FalhaPagamento, PagamentoPedido.ultimaFalha
app/api/pagamentos/verificar/route.ts              # → verificarPagamentoPedido("cliente")
app/api/pedidos/[id]/verificar-pagamento/route.ts (+ test)  # botão do admin (protegida pelo proxy)
app/api/pagamentos/conferir-pendentes/route.ts (+ test)     # cron (CRON_SECRET)
vercel.ts                                          # cron 06:00
app/admin/(painel)/pedidos/page.tsx                # conferência automática com timeout antes de listar
lib/pedidos/apresentacao.ts                        # ultimaFalha no resumo/detalhe
components/admin/PedidosLista.tsx                  # botão "Verificar pagamento no Mercado Pago", motivo, indicador
components/admin/admin.module.css                  # estilo do aviso de falha
```

**Structure Decision**: mesmo padrão das specs anteriores — lógica em `lib/`, rotas finas em `app/api/`, UI no componente de lista já existente.

## Complexity Tracking

Sem violações a justificar.
