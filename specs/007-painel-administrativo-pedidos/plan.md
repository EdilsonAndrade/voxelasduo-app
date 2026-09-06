# Implementation Plan: Painel administrativo de pedidos

**Branch**: `edilsonaandrade/edi-81-tarefa-8-painel-administrativo-de-pedidos` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/007-painel-administrativo-pedidos/spec.md` (Linear EDI-81)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Criar em `/admin/pedidos` uma listagem única dos pedidos hoje gravados na coleção `pedidos` (site + Mercado Livre, Tarefas 3 e 7), com filtro por canal e por status, visualização do detalhe de itens/pagamento, e atualização manual de status via confirmação — reaproveitando os componentes `ConfirmModal`/`Toast` já usados em `ProdutoForm`. A rota `GET /api/pedidos` (hoje um esqueleto que retorna tudo sem filtro, criado na Tarefa 1) ganha suporte a filtros e paginação simples; uma nova rota `PATCH /api/pedidos/[id]` aplica a mudança de status. O canal "Shopee" entra como uma terceira opção nos filtros/badges (o `canalOrigem` do modelo `Pedido` já suporta o valor `"shopee"` desde a Tarefa 7), mas sem nenhuma chamada real à API da Shopee — nesta tarefa ela é só uma opção de UI marcada como "integração pendente de aprovação" (ver nota na issue EDI-81 sobre a aprovação ainda pendente na Shopee Open Platform). A proteção de acesso à rota reaproveita o mesmo estado (sem autenticação real ainda) usado hoje por `/admin/produtos`, documentado como dívida a ser fechada pela Tarefa 9/EDI-86.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 20 LTS (runtime da Vercel) — mesma base das Tarefas 1-7
**Primary Dependencies**: Next.js 16, React 19.2, `mongodb` 6.12. Nenhuma dependência nova — reaproveita `lib/pedidos/repository.ts` (Tarefa 3) e os componentes `ConfirmModal`/`Toast` já existentes em `components/admin/`
**Storage**: MongoDB Atlas — nenhuma migração de schema; consome a coleção `pedidos` já existente (`lib/models/pedido.ts`), incluindo o campo `origemExterna` (Tarefa 7) e o `canalOrigem` (que já aceita `"shopee"` embora nenhum pedido real desse canal exista ainda)
**Testing**: Vitest — testes unitários do filtro/paginação em `lib/pedidos/repository.ts` e da validação de transição de status em `lib/pedidos/atualizarStatus.ts` (mock do driver do MongoDB, mesmo padrão das Tarefas 1-7)
**Target Platform**: Web — Vercel (Serverless Functions do Next.js App Router), sem novo cron nem novo serviço externo
**Project Type**: Aplicação web full-stack única (mesma estrutura das Tarefas 1-7, sem backend separado)
**Performance Goals**: Volume pequeno (dezenas de pedidos); paginação simples (ex: 20 por página) é suficiente — sem necessidade de índices novos além do já existente `criadoEm: -1` (Tarefa 3)
**Constraints**: Nenhuma chamada à API da Shopee nesta tarefa (FR-008 do spec) — a opção "Shopee" no filtro é só interface; a rota `/admin/pedidos` ainda não tem autenticação real (mesmo estado de `/admin/produtos` hoje), o que fica registrado como dependência da Tarefa 9/EDI-86 e não bloqueia esta entrega
**Scale/Scope**: Dezenas de pedidos, dois canais com dados reais (site, Mercado Livre) e um canal preparado só na UI (Shopee)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua no estado de template padrão (placeholders `[PRINCIPLE_1_NAME]` etc.) — sem constituição própria ratificada, como já registrado nos planos das Tarefas 1-7. Não há gates formais a validar nesta fase — nenhuma violação identificada.

## Project Structure

### Documentation (this feature)

```text
specs/007-painel-administrativo-pedidos/
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
├── admin/
│   └── pedidos/
│       └── page.tsx                              # NOVO: Server Component — lista pedidos com filtro (searchParams: canal, status, pagina)
└── api/
    └── pedidos/
        ├── route.ts                              # ESTENDE: GET passa a aceitar ?canal= &status= &pagina= (Tarefa 1 tinha um esqueleto sem filtro)
        └── [id]/
            └── route.ts                          # NOVO: GET (detalhe do pedido) + PATCH (atualiza status)

lib/
└── pedidos/
    ├── repository.ts                             # ESTENDE: listarPedidos(filtro) com paginação, além de criarPedido já existente
    ├── repository.test.ts                        # ESTENDE
    ├── atualizarStatus.ts                         # NOVO: atualizarStatusPedido(id, novoStatus) — grava status + atualizadoEm
    └── atualizarStatus.test.ts                    # NOVO

components/
└── admin/
    ├── PedidosLista.tsx                           # NOVO: Client Component — filtros (canal/status), badge de canal (inclui Shopee "em breve"), botão de status com ConfirmModal + Toast reaproveitados
    └── admin.module.css                           # ESTENDE: estilos de badge por canal e select de filtro
```

**Structure Decision**: Mantém a organização por domínio já usada nas Tarefas 1-7 — a lógica de listagem/atualização de pedidos fica em `lib/pedidos/` (ao lado de `repository.ts`, já dono da criação de pedidos desde a Tarefa 3), não em um novo domínio "painel" ou "admin". A tela em si segue o padrão de `app/admin/produtos/page.tsx` (Server Component busca os dados; um Client Component isolado — aqui `PedidosLista.tsx` — cuida da interatividade de filtro e da mutação de status), reaproveitando `ConfirmModal` e `Toast` de `components/admin/` em vez de recriar diálogos de confirmação/feedback. Shopee não ganha um módulo de canal em `lib/estoque/canais/` (como Mercado Livre tem) porque nesta tarefa ela não faz nenhuma chamada externa — é apenas um valor de enum já suportado pelo modelo `Pedido.canalOrigem`, exibido na UI.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — nenhuma violação identificada (não há constituição ratificada para o projeto ainda).
