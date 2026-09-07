# Implementation Plan: Autenticação e painel do comprador (cliente)

**Branch**: `edilsonaandrade/edi-84-tarefa-10-autenticacao-e-painel-do-comprador-cliente` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/009-auth-painel-comprador/spec.md` (Linear EDI-84, parent EDI-73)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Dar ao comprador do site uma conta própria (Tarefa 10/EDI-84), separada da autenticação do painel administrativo (Tarefa 9/EDI-86): cadastro por e-mail/senha, login social Google, recuperação de senha por código enviado por e-mail (Resend), e uma área "Meus Pedidos" com o histórico de compras — incluindo pedidos feitos como convidado ou sincronizados de canal externo, associados automaticamente por e-mail. O checkout do site continua permitindo compra sem login (guest checkout), sempre exigindo um e-mail de contato. Uma segunda instância do NextAuth (`lib/auth/clienteConfig.ts`, cookie/`basePath` próprios) mantém a sessão do cliente completamente isolada da sessão do admin já em produção. Como efeito colateral necessário, o enum `StatusPedido` ganha `em_producao` e `entregue` (pedido explícito do ticket) e o `Pedido` ganha `clienteId` opcional e `rastreio` opcional. A sincronização de vendas do Mercado Livre passa a notificar o admin por e-mail (mesmo provedor Resend).

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 20 LTS (runtime da Vercel) — mesma base das Tarefas 1-9
**Primary Dependencies**: Next.js 16, React 19.2, `next-auth` v5, `bcryptjs` (já instalados) + **novo**: `resend` (SDK oficial do Resend para envio de e-mail transacional)
**Storage**: MongoDB Atlas — nova coleção `clientes` (`lib/models/cliente.ts`), índice único em `email`; `Pedido` ganha `clienteId?` e `rastreio?` (sem migração — campos opcionais, documentos antigos continuam válidos); novos índices `{ "cliente.email": 1 }` e `{ clienteId: 1 }` na coleção `pedidos`
**Testing**: Vitest — testes unitários de `authorize()` do Credentials do cliente, do callback de unificação por e-mail (Google ⇄ e-mail/senha), da geração/validação do código de recuperação de senha, da query de "Meus Pedidos" (clienteId vs. correspondência por e-mail), e do envio de e-mail (mock do client do Resend) — mesmo padrão de mock do driver do MongoDB já usado nas Tarefas 1-9
**Target Platform**: Web — Vercel (Serverless Functions do Next.js App Router + `proxy.ts`); a segunda instância do NextAuth roda no mesmo runtime Node.js já usado pela instância do admin
**Project Type**: Aplicação web full-stack única (mesma estrutura das Tarefas 1-9, sem backend separado)
**Performance Goals**: Sem meta nova de performance — mesmo volume de tráfego das tarefas anteriores
**Constraints**: Sem exclusão de conta, sem múltiplos endereços salvos para escolha ativa no checkout, sem alteração de e-mail de login (spec.md `## Assumptions`); checkout continua permitindo compra como convidado — nunca passa a exigir login (decisão validada com o usuário)
**Scale/Scope**: Volume de clientes da loja (não administrativo) — sem limite fixo conhecido, mas sem exigência de performance além do padrão web já usado no site

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua no estado de template padrão (placeholders `[PRINCIPLE_1_NAME]` etc.) — sem constituição própria ratificada, como já registrado nos planos das Tarefas 1-9. Não há gates formais a validar nesta fase — nenhuma violação identificada.

## Project Structure

### Documentation (this feature)

```text
specs/009-auth-painel-comprador/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── auth-cliente-api.md
│   └── email-transacional.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
proxy.ts                                          # ESTENDE: adiciona checagem da sessão do cliente para /minha-conta/** e /api/clientes/** (contracts/auth-cliente-api.md), sem alterar a proteção já existente do admin

components/
└── SiteHeader.tsx                                  # ESTENDE (Server Component, sem mudar de tipo): passa a chamar await auth() de lib/auth/clienteConfig.ts e exibir "Entrar" (→ /entrar) ou "Minha conta" (→ /minha-conta) conforme sessão do cliente

app/
├── (loja)/                                        # NOVO route group — não altera a URL, isola as páginas públicas de cliente do layout específico delas
│   ├── layout.tsx                                 # NOVO: só container/estilo comum às páginas de cliente — sem SessionProvider (research.md #9b: sessão é sempre lida server-side via auth() de clienteConfig.ts, mesmo padrão do app/admin/(painel)/layout.tsx)
│   ├── entrar/page.tsx                             # NOVO: login (e-mail/senha + "Entrar com Google")
│   ├── cadastro/page.tsx                           # NOVO: cadastro por e-mail/senha
│   ├── recuperar-senha/page.tsx                    # NOVO: solicitar código por e-mail
│   ├── redefinir-senha/page.tsx                    # NOVO: informar código + nova senha
│   └── minha-conta/
│       ├── page.tsx                                # NOVO: dados cadastrais (editar telefone/endereço) + histórico de endereços
│       └── pedidos/
│           ├── page.tsx                             # NOVO: lista "Meus Pedidos"
│           └── [id]/page.tsx                        # NOVO: detalhe de um pedido (itens, valor, status, canal, rastreio)
└── api/
    ├── auth/
    │   └── cliente/
    │       └── [...nextauth]/route.ts               # NOVO: expõe GET/POST do NextAuth do cliente (delega para lib/auth/clienteConfig.ts)
    ├── clientes/
    │   ├── route.ts                                  # NOVO: POST cadastro por e-mail/senha
    │   ├── recuperar-senha/route.ts                  # NOVO: POST solicitar código
    │   ├── redefinir-senha/route.ts                  # NOVO: POST validar código + trocar senha
    │   ├── pedidos/route.ts                          # NOVO: GET "Meus Pedidos"
    │   └── me/
    │       ├── route.ts                              # NOVO: PATCH atualizar cadastro
    │       └── enderecos/route.ts                    # NOVO: GET histórico de endereços
    ├── pedidos/route.ts                              # ESTENDE: POST associa clienteId quando houver sessão de cliente válida (guest checkout continua funcionando sem sessão)
    └── webhooks/mercado-livre/pedidos/route.ts        # ESTENDE: chama notificarAdminVendaExterna quando upsertPedidoExterno retorna criado:true

lib/
├── auth/
│   ├── clienteConfig.ts                            # NOVO: segunda instância NextAuth — Credentials + Google, callback signIn de unificação por e-mail
│   ├── clienteConfig.test.ts                        # NOVO: testes do authorize() e do callback de unificação
│   ├── rotaProtegidaCliente.ts                       # NOVO: rotaClienteExigeAutenticacao(pathname, method) — mesma forma de lib/auth/rotaProtegida.ts (Tarefa 9), matriz do contracts/auth-cliente-api.md
│   └── rotaProtegidaCliente.test.ts                  # NOVO
├── clientes/
│   ├── repository.ts                                # NOVO: CRUD de Cliente (buscar/criar/atualizar por e-mail, unificação de providers)
│   ├── recuperacaoSenha.ts                           # NOVO: gerar/validar código de recuperação (hash + expiração)
│   ├── pedidosAssociados.ts                          # NOVO: query de "Meus Pedidos" (clienteId OR cliente.email) + histórico de endereços derivado
│   └── *.test.ts                                     # NOVO: testes das funções acima (mock do driver do MongoDB)
├── email/
│   └── resend.ts                                    # NOVO: cliente do Resend + enviarCodigoRecuperacao + notificarAdminVendaExterna (contracts/email-transacional.md)
├── models/
│   ├── cliente.ts                                    # NOVO: interface Cliente + CLIENTES_COLLECTION
│   └── pedido.ts                                     # ESTENDE: StatusPedido ganha em_producao/entregue; Pedido ganha clienteId?/rastreio?
└── pedidos/
    └── repository.ts                                 # ESTENDE: criarPedido aceita clienteId opcional

components/
└── cliente/
    ├── FormularioLogin.tsx                           # NOVO: e-mail/senha + botão Google — submete via Server Actions que chamam signIn de lib/auth/clienteConfig.ts (research.md #9b, não next-auth/react)
    ├── FormularioCadastro.tsx                        # NOVO
    ├── FormularioRecuperarSenha.tsx                  # NOVO
    ├── FormularioRedefinirSenha.tsx                  # NOVO
    ├── ListaPedidos.tsx                               # NOVO: cards de "Meus Pedidos" (itens, valor, status, canal, rastreio)
    ├── FormularioDadosCadastrais.tsx                  # NOVO: editar telefone/endereço
    └── cliente.module.css                            # NOVO
```

**Structure Decision**: Autenticação do cliente vira um novo domínio `lib/clientes/` + `lib/auth/clienteConfig.ts`, espelhando a separação já usada entre `lib/auth/` (sessão) e os domínios de negócio (`lib/pedidos/`, `lib/produtos/`) — em vez de estender `lib/auth/config.ts` e `lib/models/usuario.ts` do admin, mantendo os dois domínios de autenticação (admin vs. cliente) fisicamente separados (research.md #1), o que reduz o risco de uma mudança nesta tarefa afetar a autenticação do admin já em produção. As páginas públicas do cliente ficam num novo route group `app/(loja)/`, com um `layout.tsx` próprio só para container/estilo — a sessão é sempre lida server-side via `auth()` de `clienteConfig.ts` (mesmo padrão do `app/admin/(painel)/layout.tsx` da Tarefa 9, sem `SessionProvider`; research.md #9b explica por que os formulários de login/cadastro/logout usam Server Actions em vez dos helpers client-side de `next-auth/react`). `lib/email/resend.ts` é um módulo novo e único (não pertence a `lib/clientes/`) porque também é usado pelo webhook do Mercado Livre, fora do domínio de clientes.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — nenhuma violação identificada (não há constituição ratificada para o projeto ainda).
