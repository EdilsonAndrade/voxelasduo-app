# Implementation Plan: Aviso de venda aguardando liberação para postagem (Mercado Livre)

**Branch**: `edilsonaandrade/edi-105-mercado-livre-exibir-no-admin-quando-a-venda-esta-aguardando` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/018-ml-liberacao-postagem/spec.md`

## Summary

Estender o webhook `shipments` já implementado no EDI-101 (`app/api/webhooks/mercado-livre/envios/route.ts`) para também capturar o substatus `buffered` (envio com "etiqueta com data programada" — usado pelo Mercado Livre para escalonar postagens, ex.: greve dos Correios) e a data em que a etiqueta será liberada. Essa data é gravada num campo novo em `Pedido` e exibida como um aviso na listagem do admin (`PedidosLista.tsx`), sem alterar o `status` do pedido (FR-004).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19
**Primary Dependencies**: Next.js, MongoDB driver (`mongodb`), integração própria com a API do Mercado Livre (`lib/estoque/canais/mercadoLivre/*`) — nenhuma dependência nova
**Storage**: MongoDB, coleção `pedidos` — um campo novo em `Pedido` (`envioAguardandoLiberacaoAte?: Date`, data-model.md); nenhuma coleção nova
**Testing**: Vitest (`environment: "node"`) — lógica de integração e o endpoint de callback (extensão dos testes já existentes do EDI-101); UI da listagem verificada manualmente via Test Guide (sem `jsdom` no projeto, mesmo padrão já aceito em EDI-99/EDI-98)
**Target Platform**: Web (admin do site, Next.js na Vercel)
**Project Type**: web-service (aplicação Next.js full-stack existente)
**Performance Goals**: N/A além do padrão já aceito para os demais webhooks — sem SLA de tempo real (SC-001 do spec: até 5 minutos)
**Constraints**: Reaproveitar 100% o endpoint de callback do EDI-101 (mesmo `POST /api/webhooks/mercado-livre/envios`) — sem tópico novo a assinar (spec.md/Assumptions); o formato exato do substatus `buffered` (nome do campo de data) precisa ser validado contra um envio real antes de produção (research.md #1, mesma ressalva já aceita em EDI-98/EDI-101 por bloqueio de fetch automatizado na doc oficial)
**Scale/Scope**: Loja pequena — mesmo volume baixo de envios por dia do EDI-101

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` está com o template de exemplo, sem princípios preenchidos pelo projeto — nenhum gate adicional a verificar além dos já seguidos por convenção (padrões deste plano: lógica testável em `lib/`, sem dependência nova, mudança de schema mínima e aditiva — um campo opcional novo, sem afetar `status`).

## Project Structure

### Documentation (this feature)

```text
specs/018-ml-liberacao-postagem/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── webhook-envios-liberacao.md
└── tasks.md             # Fase 2 (/speckit.tasks)
```

### Source Code (repository root)

Aplicação Next.js única (App Router) já existente — sem estrutura nova, só arquivos alterados dentro do que o EDI-101 já criou:

```text
lib/models/pedido.ts                          # alterado: campo novo Pedido.envioAguardandoLiberacaoAte?

lib/estoque/canais/mercadoLivre/
├── envios.ts                                 # alterado: buscarEnvioMercadoLivre também retorna aguardandoLiberacaoAte?
└── envios.test.ts                            # alterado

lib/pedidos/
├── atualizarStatus.ts                        # alterado: nova função atualizarAguardandoLiberacaoPedido(id, data | null)
└── apresentacao.ts                           # alterado: PedidoResumo/PedidoDetalhado expõem envioAguardandoLiberacaoAte

app/api/webhooks/mercado-livre/envios/
├── route.ts                                  # alterado: chama atualizarAguardandoLiberacaoPedido conforme o substatus
└── route.test.ts                             # alterado

components/admin/
├── PedidosLista.tsx                          # alterado: badge/aviso "aguardando liberação — libera em DD/MM"
└── admin.module.css                          # alterado: estilo do novo badge
```

**Structure Decision**: Extensão cirúrgica do que já existe (EDI-101 + EDI-84) — nenhum arquivo novo de rota ou de integração, só os pontos que já processam o envio e exibem o pedido no admin. Mesmo padrão de mudança mínima já usado em EDI-99 (alteração de UI existente + lib, sem endpoint novo).

## Complexity Tracking

> Sem violações do Constitution Check — nada a justificar aqui.
