# Implementation Plan: Autenticação e proteção do painel administrativo

**Branch**: `edilsonaandrade/edi-86-tarefa-9-autenticacao-e-protecao-do-painel-administrativo` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/008-auth-painel-admin/spec.md` (Linear EDI-86, parent EDI-73)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Fechar a dívida de segurança registrada nas Tarefas 8/EDI-81 e no painel de produtos (hoje `/admin/produtos` e `/admin/pedidos` são acessíveis a qualquer pessoa com a URL): implementar login com NextAuth v5 (Credentials provider + sessão JWT stateless) e um `middleware.ts` central que exige sessão válida para acessar qualquer rota `/admin/**`, redirecionando para uma nova tela `/admin/login`, além das rotas de API que essas páginas consomem para leitura/mutação (`/api/produtos/**` inteiro e `/api/pedidos/[id]/**`) — preservando `POST /api/pedidos` público, pois é a rota usada pelo checkout do cliente. Os dois administradores (usuário + filha) são cadastrados numa nova coleção `usuarios` via script de seed manual (`scripts/seed-admin.ts`, mesmo padrão do `scripts/seed.ts` já existente), com senha em hash bcrypt — sem tela de auto-registro. Um novo `app/admin/layout.tsx` centraliza o `SessionProvider` e o botão de logout em todas as páginas do painel.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 20 LTS (runtime da Vercel) — mesma base das Tarefas 1-8
**Primary Dependencies**: Next.js 16, React 19.2 (já instalados) + **novas**: `next-auth` v5 (Auth.js — Credentials provider, sessão JWT, `middleware.ts`) e `bcryptjs` (hash de senha; ver `research.md` Decisão 3 sobre por que não `bcrypt` nativo)
**Storage**: MongoDB Atlas — nova coleção `usuarios` (`lib/models/usuario.ts`), índice único em `email`; nenhuma coleção de sessão (estratégia JWT stateless)
**Testing**: Vitest — testes unitários do `authorize()` do Credentials provider (hash correto/incorreto, e-mail inexistente) e do comportamento do `middleware.ts` (rotas protegidas vs. exceção do `POST /api/pedidos`), mesmo padrão de mock do driver do MongoDB das Tarefas 1-8
**Target Platform**: Web — Vercel (Serverless Functions do Next.js App Router + Middleware); `middleware.ts` roda em runtime compatível (JWT verificado via `jose`, sem dependência de Node APIs pesadas)
**Project Type**: Aplicação web full-stack única (mesma estrutura das Tarefas 1-8, sem backend separado)
**Performance Goals**: Irrelevante para este volume (1-2 administradores); nenhuma meta de performance nova
**Constraints**: Sem recuperação de senha por e-mail, sem múltiplos níveis de permissão, sem auto-registro (FR-009/FR-010 do spec — decisão já validada com o usuário); `/api/anuncios/pendencias` e `/api/estoque/pendencias` ficam fora do escopo desta tarefa por não serem consumidos por nenhuma página `/admin` hoje (ver `research.md`, Decisão 4)
**Scale/Scope**: 1-2 usuários administradores fixos, cadastrados manualmente

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua no estado de template padrão (placeholders `[PRINCIPLE_1_NAME]` etc.) — sem constituição própria ratificada, como já registrado nos planos das Tarefas 1-8. Não há gates formais a validar nesta fase — nenhuma violação identificada.

## Project Structure

### Documentation (this feature)

```text
specs/008-auth-painel-admin/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
proxy.ts                                          # NOVO: protege /admin/**, /api/produtos/**, /api/pedidos/[id]/** (exceto POST /api/pedidos) — Next.js 16 renomeou middleware.ts para proxy.ts

app/
├── admin/
│   ├── login/
│   │   └── page.tsx                              # NOVO: tela de login (Client Component, form e-mail/senha)
│   └── (painel)/                                 # NOVO route group — não altera a URL, só isola /admin/login do layout abaixo
│       ├── layout.tsx                            # NOVO: barra superior (nome do admin logado + botão "Sair"), busca sessão via auth()
│       ├── produtos/  (movido de app/admin/produtos — sem mudança de lógica, passa a herdar a proteção do proxy + layout)
│       └── pedidos/   (movido de app/admin/pedidos — idem)
└── api/
    └── auth/
        └── [...nextauth]/
            └── route.ts                          # NOVO: expõe GET/POST do NextAuth (delega para lib/auth/config.ts)

lib/
├── auth/
│   ├── config.ts                                 # NOVO: NextAuth config — Credentials provider, sessão jwt, callbacks (id/nome na sessão)
│   └── config.test.ts                            # NOVO: testes do authorize() (senha certa/errada, e-mail inexistente)
└── models/
    └── usuario.ts                                # NOVO: interface Usuario + USUARIOS_COLLECTION

components/
└── admin/
    ├── LoginForm.tsx                              # NOVO: Client Component do formulário (usa signIn), reaproveita admin.module.css
    ├── SairButton.tsx                              # NOVO: botão de logout (usa signOut), usado no layout
    └── admin.module.css                           # ESTENDE: estilos da barra superior do layout (se necessário além do já existente .bar/.btn*)

scripts/
└── seed-admin.ts                                 # NOVO: cadastra/atualiza um administrador (email, senha, nome) via CLI args — mesmo padrão de scripts/seed.ts
```

**Structure Decision**: Autenticação vira um novo domínio `lib/auth/` (ao lado de `lib/produtos/`, `lib/pedidos/`, etc.), seguindo a organização por domínio já usada no projeto. A proteção fica centralizada em um único `middleware.ts` na raiz (ver `research.md` Decisão 4) em vez de checagem repetida em cada Route Handler — mais fácil de auditar e menos risco de esquecer uma rota nova. O layout `app/admin/layout.tsx` é novo (hoje as páginas `/admin/*` não compartilham layout nenhum além do `app/layout.tsx` global) e passa a ser o lugar natural para o `SessionProvider` (exigido pelos hooks client-side do NextAuth) e o botão de logout, evitando duplicá-lo em cada página.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — nenhuma violação identificada (não há constituição ratificada para o projeto ainda).
