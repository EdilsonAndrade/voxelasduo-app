# Implementation Plan: Abatimento de Estoque e Sincronização Multicanal

**Branch**: `edilsonaandrade/edi-78-tarefa-5-abatimento-de-estoque-e-sincronizacao-ao-vender-no` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-estoque-sincronizacao-canais/spec.md` (Linear EDI-78)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Ao confirmar um pagamento (mesmo ponto de idempotência já existente em `promoverPedidoSeAprovado`, Tarefa 4), abater atomicamente o estoque de cada item do pedido no MongoDB e, em seguida, sincronizar a nova quantidade com os canais externos através de uma função única e reutilizável (`sincronizarEstoqueProduto`). Mercado Livre é integrado de ponta a ponta (credenciais reais já disponíveis, com renovação automática de token OAuth2). Shopee é construído atrás da mesma interface, mas roda como canal "não configurado" (sem chamada HTTP real) até a aprovação do app na Shopee Open Platform — trocar para real depois não exige mudança de fluxo. Falhas de sincronização entram em uma fila com retry/backoff (reprocessada por um Vercel Cron a cada 15 minutos) e falhas persistentes, assim como estoque insuficiente no momento do abatimento, ficam registradas e consultáveis (`GET /api/estoque/pendencias`) para revisão manual — nunca bloqueando o pedido nem os demais canais.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 20 LTS (runtime da Vercel) — mesma base das Tarefas 1-4
**Primary Dependencies**: Next.js 16, React 19.2, `mongodb` 6.12 (já no projeto). Nenhuma dependência nova de SDK — Mercado Livre e Shopee são integrados via `fetch` direto (não há SDK oficial Node mantido para nenhum dos dois); `vercel.ts`/`@vercel/config` para declarar o cron de reprocessamento
**Storage**: MongoDB Atlas — coleção `produtos` ganha campo opcional `integracoes`; três coleções novas: `sincronizacoesEstoque` (fila/log), `estoqueInconsistencias` (revisão manual), `credenciaisCanais` (tokens OAuth2 do Mercado Livre)
**Testing**: Vitest — testes unitários do abatimento atômico (`$inc`/`$gte`), do cálculo de backoff da fila, do mapeamento "canal configurado vs. não configurado" (FR-007), e do client do Mercado Livre com `fetch` mockado
**Target Platform**: Web — Vercel (Serverless Functions do Next.js + Vercel Cron)
**Project Type**: Aplicação web full-stack única (mesma estrutura das Tarefas 1-4, sem backend separado)
**Performance Goals**: Volume pequeno (dezenas de vendas); tentativa imediata de sincronização não pode atrasar perceptivelmente a resposta do webhook do Mercado Pago (timeout curto, falha vira item de fila em vez de bloquear)
**Constraints**: Sem backend separado; nenhuma credencial versionada (`.env.local`/Vercel env vars); `refreshToken` do Mercado Livre é rotativo e por isso persistido no MongoDB (`credenciaisCanais`), não só em variável de ambiente; Shopee sem chamada HTTP real nesta tarefa (perfil em análise); cadência do Vercel Cron pode precisar de ajuste conforme o plano Vercel vigente (Hobby costuma ter frequência mínima maior que planos pagos)
**Scale/Scope**: Dezenas de vendas; poucos canais (2) e poucos itens por pedido

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua no estado de template padrão (placeholders `[PRINCIPLE_1_NAME]` etc.) — sem constituição própria ratificada, como já registrado nos planos das Tarefas 1-4. Não há gates formais a validar nesta fase — nenhuma violação identificada.

## Project Structure

### Documentation (this feature)

```text
specs/005-estoque-sincronizacao-canais/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
└── api/
    └── estoque/
        ├── sincronizar/
        │   └── route.ts                # POST: reprocessa fila (chamado pelo Vercel Cron ou manualmente)
        └── pendencias/
            └── route.ts                # GET: lista sincronizações pendentes/falhas + inconsistências de estoque

vercel.ts                               # NOVO: declara o cron de /api/estoque/sincronizar

lib/
├── models/
│   ├── produto.ts                      # ESTENDE: campo opcional `integracoes`
│   ├── estoqueSincronizacao.ts         # NOVO: tipos de `sincronizacoesEstoque` e `estoqueInconsistencias`
│   └── credenciaisCanal.ts             # NOVO: tipo de `credenciaisCanais`
├── pagamentos/
│   └── repository.ts                   # ESTENDE: `promoverPedidoSeAprovado` chama `abaterEstoquePedido` quando modifiedCount === 1
└── estoque/
    ├── abatimento.ts                   # NOVO: abaterEstoquePedido — $inc/$gte atômico por item + registro de inconsistências
    ├── abatimento.test.ts
    ├── sincronizacao.ts                # NOVO: sincronizarEstoqueProduto — função reutilizável (canal configurado, fila, tentativa imediata)
    ├── sincronizacao.test.ts
    ├── fila.ts                         # NOVO: repository de `sincronizacoesEstoque` (criar/marcar sucesso/calcular backoff/listar pendências)
    ├── fila.test.ts
    └── canais/
        ├── tipos.ts                    # NOVO: interface comum CanalEstoqueClient
        ├── mercadoLivre.ts             # NOVO: client real (fetch + refresh de token via credenciaisCanais)
        ├── mercadoLivre.test.ts
        └── shopee.ts                   # NOVO: client stub (não configurado até aprovação do app)

components/
└── admin/
    └── ProdutoForm.tsx                 # ESTENDE (Tarefa 2): dois campos opcionais de integração (mercadoLivreId, shopeeItemId)
```

**Structure Decision**: Mantém o projeto Next.js único das Tarefas 1-4. A lógica de domínio nova fica isolada em `lib/estoque/` (paralelo a `lib/pagamentos/` e `lib/pedidos/`), com os clients de canal em um subdiretório próprio (`lib/estoque/canais/`) atrás de uma interface comum — permite trocar Shopee de stub para real sem tocar em `sincronizacao.ts`. O único ponto de integração com código já existente é a chamada a `abaterEstoquePedido` dentro de `promoverPedidoSeAprovado`, mantendo o gatilho de estoque amarrado à mesma idempotência de pagamento já validada na Tarefa 4. `vercel.ts` é novo no projeto (nenhum `vercel.json` existia) e adota a convenção atual da Vercel para configuração declarativa do cron.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — nenhuma violação identificada (não há constituição ratificada para o projeto ainda).
