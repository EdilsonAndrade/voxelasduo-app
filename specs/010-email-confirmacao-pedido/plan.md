# Implementation Plan: E-mail de confirmação de pedido e padronização visual dos e-mails transacionais

**Branch**: `edilsonaandrade/edi-87-tarefa-12-e-mail-de-confirmacao-de-pedido-para-compra-no` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/010-email-confirmacao-pedido/spec.md` (Linear EDI-87, parent EDI-73, relacionado a EDI-84)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Enviar um e-mail de confirmação de pedido (número, itens, valor total) ao comprador do site — autenticado ou convidado — assim que o pagamento é aprovado (`Pedido.status` vira `"pago"`), reaproveitando o cliente Resend já configurado em `lib/email/resend.ts` (Tarefa 10/EDI-84). O gatilho é `promoverPedidoSeAprovado` em `lib/pagamentos/repository.ts`, o único ponto que promove um pedido a "pago" de forma condicional/idempotente (tanto na resposta síncrona do checkout quanto no webhook assíncrono do Mercado Pago) — reaproveitar essa mesma condição evita e-mail duplicado sem mecanismo próprio de idempotência (FR-004). Pedidos de canal externo (Mercado Livre) não passam por esse caminho, então naturalmente ficam fora do escopo (FR-007). Um novo módulo `lib/email/templates.ts` centraliza um layout HTML de e-mail com a identidade visual da marca (logo `public/images/logo.png`, paleta de `specs/002-catalogo-produtos/design-tokens.md`), usado tanto pelo novo `enviarConfirmacaoPedido` quanto pelas três funções já existentes (`enviarCodigoRecuperacao`, `enviarCodigoVerificacao`, `notificarAdminVendaExterna`), que passam a enviar `html` além de `text` puro.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 20 LTS (runtime da Vercel) — mesma base das Tarefas 1-10
**Primary Dependencies**: `resend` (já instalado, Tarefa 10/EDI-84) — nenhuma dependência nova. O template de e-mail é HTML com estilos inline montado por função de string (mesmo nível de simplicidade já usado no projeto), sem introduzir `@react-email/components` ou similar, que seria escopo não pedido
**Storage**: MongoDB Atlas — nenhuma mudança de schema; `Pedido` já contém tudo que o e-mail precisa (`itens`, `cliente.email`, `valorTotal`, `_id` como número do pedido)
**Testing**: Vitest — mesmo padrão de mock do client do Resend já usado em `lib/email/resend.test.ts`; novo teste unitário de `promoverPedidoSeAprovado` (`lib/pagamentos/repository.test.ts`, hoje inexistente) cobrindo a não-duplicação do e-mail em reprocessamento
**Target Platform**: Web — Vercel (Serverless Functions do Next.js App Router), mesmo runtime Node.js já usado pelo webhook do Mercado Pago e pelo checkout
**Project Type**: Aplicação web full-stack única (mesma estrutura das Tarefas 1-10, sem backend separado)
**Performance Goals**: Sem meta nova — envio é best-effort e assíncrono, nunca bloqueia a resposta do checkout nem do webhook (FR-005)
**Constraints**: HTML precisa renderizar de forma consistente nos principais clientes de e-mail (Gmail, Outlook, Apple Mail) — layout baseado em tabela com estilos inline, sem depender de CSS externo para o essencial; a logo precisa ser referenciada por URL absoluta (e-mails não resolvem caminhos relativos de `public/`), o que exige uma nova variável de ambiente com a URL pública do site
**Scale/Scope**: Mesmo volume de pedidos do checkout do site já suportado hoje — sem meta nova

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua no estado de template padrão (placeholders `[PRINCIPLE_1_NAME]` etc.) — sem constituição própria ratificada, como já registrado nos planos das Tarefas 1-10. Não há gates formais a validar nesta fase — nenhuma violação identificada.

## Project Structure

### Documentation (this feature)

```text
specs/010-email-confirmacao-pedido/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── email-transacional.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
lib/
├── email/
│   ├── templates.ts                                # NOVO: layout HTML compartilhado (cabeçalho com logo, cores da marca, rodapé) + helper de formatação de valor em reais
│   ├── templates.test.ts                            # NOVO
│   ├── resend.ts                                     # ESTENDE: enviarCodigoRecuperacao/enviarCodigoVerificacao/notificarAdminVendaExterna passam a enviar `html` (via templates.ts) além de `text`; nova função enviarConfirmacaoPedido(pedido)
│   └── resend.test.ts                                # ESTENDE: novos testes de enviarConfirmacaoPedido + garante que as funções existentes também enviam `html`
└── pagamentos/
    ├── repository.ts                                 # ESTENDE: promoverPedidoSeAprovado chama enviarConfirmacaoPedido(pedidoPromovido) logo após abaterEstoquePedido — reaproveita a mesma condição idempotente do findOneAndUpdate (FR-004)
    └── repository.test.ts                             # NOVO: cobre a não-duplicação do e-mail quando a mesma aprovação é reprocessada (registrarTentativa + atualizarStatusTentativa para o mesmo pedido)

.env.example                                           # ESTENDE: nova variável SITE_URL (URL pública do site, usada para montar o link absoluto da logo nos e-mails)
```

**Structure Decision**: Mantém a decisão já registrada no plano da Tarefa 10 — `lib/email/` continua um módulo único e independente de `lib/clientes/`, usado por múltiplos domínios (pagamentos, clientes, webhook do Mercado Livre). O novo `lib/email/templates.ts` isola a camada de apresentação (HTML/marca) das funções de envio existentes em `resend.ts`, para que as quatro funções (recuperação de senha, verificação de cadastro, notificação de venda externa, confirmação de pedido) compartilhem o mesmo layout sem duplicar HTML. O gatilho da confirmação de pedido fica em `lib/pagamentos/repository.ts` (não em `app/api/pagamentos/webhook/route.ts` nem em `app/api/pedidos/route.ts`) porque `promoverPedidoSeAprovado` já é o único ponto, usado pelos dois caminhos (resposta síncrona do checkout e webhook assíncrono), que decide de forma idempotente se este pedido está sendo promovido a "pago" agora — o mesmo raciocínio já usado para amarrar o abatimento de estoque a essa função (Tarefa 5/EDI-78).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — nenhuma violação identificada (não há constituição ratificada para o projeto ainda).
