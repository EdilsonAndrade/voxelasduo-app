# Implementation Plan: Rastreio automático via webhook de envios do Mercado Livre

**Branch**: `edilsonaandrade/edi-101-mercado-livre-assinar-webhook-de-envios-shipments-para` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/017-ml-webhook-shipments/spec.md`

## Summary

Assinar mais um tópico de notificação do Mercado Livre (`shipments`), com um endpoint de callback seguindo o mesmo padrão já usado em `orders_v2`/EDI-98: o payload é só o gatilho, o detalhe do envio é sempre buscado via GET autenticado. Ao receber a notificação, o pedido correspondente (vinculado por `origemExterna.pedidoExternoId`, mesmo campo já usado por `orders_v2`) tem `rastreio.codigo`/`rastreio.transportadora` e `status` atualizados automaticamente, reaproveitando `atualizarRastreioPedido`/`atualizarStatusPedido` já existentes (Tarefa 10/EDI-84) — sem mudança de schema em `Pedido`.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19
**Primary Dependencies**: Next.js, MongoDB driver (`mongodb`), integração própria com a API do Mercado Livre (`lib/estoque/canais/mercadoLivre/*`) — nenhuma dependência nova
**Storage**: MongoDB, coleção `pedidos` — nenhuma mudança de schema (`Pedido.rastreio`/`Pedido.status` já existem, data-model.md)
**Testing**: Vitest (`environment: "node"`) — lógica de integração e o endpoint de callback testados; mesmo padrão de `pedidos/route.test.ts`
**Target Platform**: Web (Next.js na Vercel)
**Project Type**: web-service (aplicação Next.js full-stack existente)
**Performance Goals**: N/A além do padrão já aceito para os demais webhooks — sem SLA de tempo real (SC-001/SC-002 do spec: até 5 minutos)
**Constraints**: Reaproveitar `obterAccessTokenValido()`/`erroMercadoLivre()` já existentes; o mesmo contrato de "confirmar recebimento" do `orders_v2` (200 mesmo sem processar, 500 só em falha transitória); a API do Mercado Livre descontinuou `order_id` em `GET /shipments/{id}` a partir de 12/10/2025 — o vínculo com o pedido precisa vir de `GET /shipments/{id}/items` (research.md #1)
**Scale/Scope**: Loja pequena — volume baixo de envios por dia

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` está com o template de exemplo, sem princípios preenchidos pelo projeto — nenhum gate adicional a verificar além dos já seguidos por convenção (padrões deste plano: lógica testável em `lib/`, sem dependência nova, sem mudança de schema, endpoint de webhook nunca vaza erro 4xx/5xx desnecessário ao Mercado Livre).

## Project Structure

### Documentation (this feature)

```text
specs/017-ml-webhook-shipments/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── webhook-shipments.md
└── tasks.md             # Fase 2 (/speckit.tasks)
```

### Source Code (repository root)

Aplicação Next.js única (App Router) já existente — sem estrutura nova, só arquivos criados/alterados dentro do layout atual:

```text
app/api/webhooks/mercado-livre/
└── envios/route.ts               # novo: callback do tópico `shipments`
                                    # (+ route.test.ts, mesmo padrão de pedidos/route.test.ts)

lib/estoque/canais/mercadoLivre/
├── envios.ts                     # novo: buscarEnvioMercadoLivre(shipmentId)
└── envios.test.ts

lib/pedidos/
├── repository.ts                 # alterado: nova função buscarPedidoPorOrigemExterna(pedidoExternoId)
└── atualizarStatus.ts            # sem alteração — atualizarRastreioPedido/atualizarStatusPedido já existem e são reaproveitados
```

**Structure Decision**: Mesmo padrão já usado em `orders_v2`/EDI-98 — endpoint de callback por tópico em `app/api/webhooks/mercado-livre/`, lógica de integração com a API do Mercado Livre testável em `lib/estoque/canais/mercadoLivre/`, e reaproveitamento total do que já existe em `lib/pedidos/` (rastreio e status), só adicionando o finder que falta (`buscarPedidoPorOrigemExterna`, ao lado de `buscarPedidoPorId`/`buscarPedidoPorIdempotencia` já existentes). Nenhuma UI nova — o rastreio já aparece em "Meus Pedidos" e no admin.

## Complexity Tracking

> Sem violações do Constitution Check — nada a justificar aqui.
