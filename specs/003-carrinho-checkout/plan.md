# Implementation Plan: Carrinho e Checkout

**Branch**: `edilsonaandrade/edi-76-tarefa-3-carrinho-e-checkout` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-carrinho-checkout/spec.md` (Linear EDI-76)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implementar carrinho de compras com estado no cliente (Contexto React + persistência em localStorage, sem nova dependência de state management) e o fluxo de checkout completo sobre o catálogo criado na Tarefa 2 (EDI-75): páginas `/carrinho` e `/checkout`, formulário com dados do cliente e endereço de entrega, resumo do pedido com preços sempre recalculados no servidor, validação de estoque no momento da confirmação e criação do pedido com status "pendente" via nova rota `POST /api/pedidos` (decisão do usuário registrada no spec), seguida da página de confirmação `/pedido/[id]`. Pagamento (EDI-77) e abatimento de estoque (EDI-78) ficam fora do escopo — aqui o estoque é apenas validado, nunca alterado.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 20 LTS (runtime da Vercel) — mesma base das Tarefas 1 e 2
**Primary Dependencies**: Next.js 16 (App Router, já no projeto), React 19.2, driver oficial `mongodb` 6.12 (já no projeto). Nenhuma dependência nova nesta tarefa — carrinho usa React Context + `useReducer` + `localStorage` (o ticket sugere "contexto React ou biblioteca leve"; contexto evita dependência extra)
**Storage**: MongoDB Atlas — coleção `pedidos` (já modelada em `lib/models/pedido.ts`, ganha campo opcional `idempotencia` nesta tarefa) e coleção `produtos` (somente leitura para validar estoque e preços no servidor). Carrinho é persistido no `localStorage` do navegador do cliente
**Testing**: Vitest (introduzido na Tarefa 2) — testes unitários das novas regras de negócio (cálculo de totais do carrinho, validação de payload do pedido, validação de estoque), complementando `tsc --noEmit` e `next build`
**Target Platform**: Web — Vercel (Serverless Functions do Next.js)
**Project Type**: Aplicação web full-stack única (frontend + API Routes no mesmo projeto Next.js, sem backend separado) — mesma estrutura das Tarefas 1 e 2
**Performance Goals**: Catálogo e volume de pedidos pequenos (dezenas de produtos, projeto pessoal/familiar) — validação de estoque e criação de pedido devem ser percebidas como instantâneas; sem exigência de escala
**Constraints**: Sem backend separado; sem autenticação nesta fase (guest checkout; auth é escopo EDI-81); nenhuma credencial versionada; tier gratuito do MongoDB Atlas (M0); sem abatimento de estoque nesta tarefa (EDI-78); sem cálculo de frete (não mencionado no ticket, decisão registrada no spec); projeto multi-idioma (I18N) — ver Research sobre o estado atual do projeto
**Scale/Scope**: Dezenas de produtos; carrinho com número pequeno de itens por compra; um pedido por checkout confirmado

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua no estado de template padrão (placeholders `[PRINCIPLE_1_NAME]` etc.) — sem constituição própria ratificada, como já registrado nos planos das Tarefas 1 e 2. Não há gates formais a validar nesta fase — nenhuma violação identificada. Recomendação mantida: rodar `/speckit-constitution` em algum momento.

## Project Structure

### Documentation (this feature)

```text
specs/003-carrinho-checkout/
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
├── carrinho/
│   └── page.tsx                    # Página do carrinho: itens, quantidades, remoção, totais, CTA para checkout
├── checkout/
│   └── page.tsx                    # Formulário (dados do cliente + endereço) + resumo do pedido
├── pedido/
│   └── [id]/
│       └── page.tsx                # Confirmação do pedido (resumo + status "pendente"); not-found se inexistente
└── api/
    └── pedidos/
        └── route.ts                # GET (mantém esqueleto da Tarefa 1) + POST (cria pedido pendente, validando estoque/preços no servidor)

components/
├── carrinho/
│   ├── CarrinhoProvider.tsx        # Contexto do carrinho (useReducer + localStorage)
│   ├── carrinho-context.ts         # Tipos, reducer, ações e helper de persistência
│   ├── BotaoAdicionarCarrinho.tsx  # Botão "adicionar ao carrinho" (com quantidade) na página de detalhe
│   ├── CarrinhoIcone.tsx           # Ícone com contador no header (site-architecture)
│   └── *.module.css                # Estilos das telas de carrinho/checkout
├── checkout/
│   ├── FormularioCheckout.tsx      # Formulário cliente (validação por campo, duplo envio bloqueado)
│   └── ResumoPedido.tsx            # Resumo (itens/total) reutilizado no checkout e na confirmação
└── SiteHeader.tsx                  # já existe — recebe o CarrinhoIcone no nav

lib/
├── models/
│   └── pedido.ts                   # já existe — adiciona campo opcional `idempotencia`
├── carrinho/
│   ├── carrinho.ts                 # Funções puras: adicionar/alterar/remover item, totais (testáveis)
│   └── carrinho.test.ts
└── pedidos/
    ├── repository.ts               # criarPedido (com idempotência + índice único), buscarPedidoPorId, validar estoque/preços a partir do banco
    ├── validation.ts               # validação do payload do checkout (cliente, endereço, itens)
    ├── validation.test.ts
    └── estoque.test.ts             # regra de validação de estoque contra produtos do banco
```

**Structure Decision**: Mantém o projeto Next.js único definido na Tarefa 1. As rotas públicas (`/carrinho`, `/checkout`, `/pedido/[id]`) seguem exatamente a hierarquia de `specs/site-architecture.md`. `lib/carrinho/` concentra a lógica de domínio pura do carrinho (testável com Vitest), `lib/pedidos/` concentra validação de checkout e acesso a dados de pedidos, e `components/carrinho|checkout` ficam com a UI — mesma divisão usada na Tarefa 2 (`lib/produtos/` + `components/produtos/`). O POST de `/api/pedidos` permanece como camada fina sobre `lib/pedidos`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — nenhuma violação identificada (não há constituição ratificada para o projeto ainda).
