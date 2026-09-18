# Implementation Plan: Webhooks de perguntas e reclamações do Mercado Livre

**Branch**: `edilsonaandrade/edi-98-mercado-livre-assinar-webhooks-de-perguntas-questions-e` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/016-ml-webhooks-questions-claims/spec.md`

## Summary

Assinar mais três tópicos de notificação do Mercado Livre (`questions`, `claims`/`claims_actions`, `messages`), além do `orders_v2` já existente, com um endpoint de callback por tópico seguindo o mesmo padrão (`app/api/webhooks/mercado-livre/pedidos/route.ts`): o payload da notificação é só o gatilho, o detalhe é sempre buscado via GET autenticado. Cada item pendente é persistido de forma idempotente e exibido numa nova área do admin ("Atendimento"), com resposta inline via API do Mercado Livre e link direto para o portal do Mercado Livre (para quem preferir agir por lá).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19
**Primary Dependencies**: Next.js, MongoDB driver (`mongodb`), integração própria com a API do Mercado Livre (`lib/estoque/canais/mercadoLivre/*`) — nenhuma dependência nova
**Storage**: MongoDB — três novas coleções (`perguntas_mercado_livre`, `reclamacoes_mercado_livre`, `mensagens_mercado_livre`), cada uma com índice único esparso no id de origem no ML (mesmo padrão de `origemExterna.pedidoExternoId` em `lib/pedidos/externos.ts`)
**Testing**: Vitest (`environment: "node"`) — lógica de integração (`lib/estoque/canais/mercadoLivre/*`) e repositório (`lib/atendimento/*`) testados; endpoints de webhook/ação testados como os de `pedidos/route.test.ts`; UI verificada manualmente via Test Guide
**Target Platform**: Web (admin do site, Next.js na Vercel)
**Project Type**: web-service (aplicação Next.js full-stack existente)
**Performance Goals**: N/A além do padrão já aceito para `orders_v2` — notificação processada de forma assíncrona ao gatilho do Mercado Livre, sem SLA de tempo real (SC-001 a SC-003 do spec: até 5 minutos)
**Constraints**: Reaproveitar `obterAccessTokenValido()` e `erroMercadoLivre()` já existentes; respostas do endpoint de callback devem seguir o mesmo contrato de "confirmar recebimento" do `orders_v2` (200 mesmo sem processar, 500 só em falha transitória, para o ML reenviar depois)
**Scale/Scope**: Loja pequena — volume baixo de perguntas/reclamações/mensagens por dia; sem necessidade de paginação sofisticada na listagem do admin nesta etapa

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` está com o template de exemplo, sem princípios preenchidos pelo projeto — nenhum gate adicional a verificar além dos já seguidos por convenção (padrões deste plano: lógica testável em `lib/`, sem dependência nova, idempotência por índice único, endpoints de webhook nunca vazam erro 4xx/5xx desnecessário ao Mercado Livre).

## Project Structure

### Documentation (this feature)

```text
specs/016-ml-webhooks-questions-claims/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── webhooks-callback.md
│   └── atendimento-responder.md
└── tasks.md             # Fase 2 (/speckit.tasks)
```

### Source Code (repository root)

Aplicação Next.js única (App Router) já existente — sem estrutura nova de projeto, só arquivos criados/alterados dentro do layout atual:

```text
app/api/webhooks/mercado-livre/
├── pedidos/route.ts              # existente, sem mudança
├── perguntas/route.ts            # novo: callback do tópico `questions`
├── reclamacoes/route.ts          # novo: callback dos tópicos `claims`/`claims_actions`
└── mensagens/route.ts            # novo: callback do tópico `messages`
                                    # (+ *.test.ts para cada um, seguindo pedidos/route.test.ts)

lib/estoque/canais/mercadoLivre/
├── perguntas.ts                  # novo: buscarPerguntaMercadoLivre, responderPerguntaMercadoLivre
├── perguntas.test.ts
├── reclamacoes.ts                # novo: buscarReclamacaoMercadoLivre, responderReclamacaoMercadoLivre
├── reclamacoes.test.ts
├── mensagens.ts                  # novo: buscarMensagemMercadoLivre, responderMensagemMercadoLivre
└── mensagens.test.ts

lib/atendimento/                  # novo módulo: perguntas/reclamações/mensagens pendentes
├── repository.ts                 # novo: coleções + upsert idempotente (padrão upsertPedidoExterno)
├── repository.test.ts
├── apresentacao.ts                # novo: monta o item de listagem (texto, link origem, pedido vinculado)
└── apresentacao.test.ts

app/api/admin/atendimento/
├── perguntas/[id]/responder/route.ts     # novo: POST responde pergunta via API do ML
├── reclamacoes/[id]/responder/route.ts   # novo: POST responde reclamação via API do ML
└── mensagens/[id]/responder/route.ts     # novo: POST responde mensagem via API do ML

app/admin/(painel)/atendimento/
└── page.tsx                       # novo: lista perguntas/reclamações/mensagens pendentes (mesmo padrão de pedidos/page.tsx)

components/admin/
├── AtendimentoLista.tsx            # novo: client component — listagem + resposta inline + link para o ML
└── admin.module.css                # alterado: estilos da nova listagem
```

**Structure Decision**: Mesmo padrão já usado em `orders_v2`/EDI-90/EDI-99 — endpoint de callback por tópico em `app/api/webhooks/mercado-livre/`, lógica de integração com a API do Mercado Livre testável em `lib/estoque/canais/mercadoLivre/`, e um módulo novo `lib/atendimento/` para persistência/apresentação dos itens pendentes, consumido por uma nova área do admin (`app/admin/(painel)/atendimento/`) com endpoints de ação próprios em `app/api/admin/atendimento/`.

## Complexity Tracking

> Sem violações do Constitution Check — nada a justificar aqui.
