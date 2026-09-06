# Tasks: Autenticação e proteção do painel administrativo

**Input**: Design documents from `specs/008-auth-painel-admin/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.md, quickstart.md

**Tests**: Incluídos — plan.md pede testes unitários (Vitest) para a lógica de autorização e de proteção de rotas, seguindo o padrão já usado no projeto (`*.test.ts` ao lado do código). Não há testes de componente React (o projeto não usa `jsdom`/testing-library — ver `vitest.config.ts`, `environment: "node"`).

**Organization**: Tarefas agrupadas por user story (spec.md) para permitir implementação e teste independentes de cada uma.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa ainda não concluída)
- **[Story]**: US1 (Login), US2 (Sessão protege navegação e APIs), US3 (Logout)

---

## Phase 1: Setup

**Purpose**: Preparar dependências e configuração antes de qualquer código novo

- [X] T001 Adicionar `next-auth` (v5) e `bcryptjs` às `dependencies`, e `@types/bcryptjs` às `devDependencies` em `package.json`; rodar `npm install` — instalado `next-auth@5.0.0-beta.32` (v5 estável ainda não publicada no registry; beta é a única com suporte a App Router/`auth()`)
- [X] T002 [P] Adicionar `AUTH_SECRET` em `.env.example`, com comentário explicando o propósito e como gerar (`openssl rand -base64 32`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de autenticação compartilhada por todas as user stories

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase estar completa

- [X] T003 [P] Criar `lib/models/usuario.ts`: interface `Usuario` (`_id`, `email`, `senhaHash`, `nome`, `criadoEm`, `atualizadoEm`) e `export const USUARIOS_COLLECTION = "usuarios"`, conforme `data-model.md`
- [X] T004 Criar `lib/auth/config.ts`: configuração do NextAuth v5 (`NextAuth({...})`), `session: { strategy: "jwt" }`, e callbacks `jwt`/`session` para incluir `id` na sessão; exportar `handlers`, `auth`, `signIn`, `signOut`. A lógica do `authorize()` foi extraída para `lib/auth/autorizarCredenciais.ts` (ver nota em T006) para ficar testável isoladamente — `config.ts` só faz a wiring do `Credentials` provider apontando pra ela (depende de T001, T003)
- [X] T005 [P] Criar `lib/auth/rotaProtegida.ts`: função pura `rotaExigeAutenticacao(pathname: string, method: string)` implementando a matriz do `contracts/auth-api.md`
- [X] T006 [P] Criar `lib/auth/autorizarCredenciais.ts` + `lib/auth/autorizarCredenciais.test.ts` (em vez de `config.test.ts` — `NextAuth(...)` não re-exporta o `authorize()` interno do provider, então a lógica foi extraída pra um módulo próprio testável): busca por `email` normalizado em minúsculas via `getMongoClient`/`DB_NAME`, compara `senha` com `senhaHash` via `bcrypt.compare`, retorna `null` em qualquer falha. Testes cobrem e-mail+senha corretos, normalização de e-mail, senha incorreta, e-mail inexistente e campos ausentes
- [X] T007 [P] Criar `lib/auth/rotaProtegida.test.ts`: testes de `rotaExigeAutenticacao` cobrindo cada linha da tabela do `contracts/auth-api.md`, incluindo a exceção do `POST /api/pedidos`
- [X] T008 Criar `scripts/seed-admin.ts` (mesmo padrão de `scripts/seed.ts`: `dotenv` + `getMongoClient`) que recebe `email`, `senha` e `nome` via `process.argv`, gera `senhaHash` com `bcrypt.hash` e faz upsert (com índice único em `email`) na coleção `usuarios`; adicionado script `"seed:admin": "tsx scripts/seed-admin.ts"` em `package.json` (depende de T001, T003)

**Checkpoint**: Infraestrutura de autenticação pronta — configuração do NextAuth, modelo de usuário e script de cadastro funcionando, cobertos por teste

---

## Phase 3: User Story 1 - Login para acessar o painel administrativo (Priority: P1) 🎯 MVP

**Goal**: Administrador não autenticado que acessa `/admin/produtos` (ou qualquer rota `/admin`) é redirecionado para `/admin/login`; ao informar e-mail/senha corretos de um usuário cadastrado, é autenticado e levado à página originalmente solicitada.

**Independent Test**: Sem sessão, acessar `/admin/produtos` deve redirecionar para `/admin/login`; logar com um usuário cadastrado via `scripts/seed-admin.ts` deve conceder acesso à página.

### Implementation for User Story 1

- [X] T009 [US1] Criar `app/api/auth/[...nextauth]/route.ts` re-exportando `GET`/`POST` de `handlers` definidos em `lib/auth/config.ts` (depende de T004)
- [X] T010 [P] [US1] Criar `components/admin/LoginForm.tsx` (Client Component): campos e-mail/senha, ao submeter chama `signIn("credentials", { email, senha, redirect: false })` do `next-auth/react`; em caso de erro, exibe mensagem genérica "E-mail ou senha inválidos." (classe `.formError` de `admin.module.css`); em caso de sucesso, navega para `callbackUrl` (ou `/admin/produtos` como padrão)
- [X] T011 [US1] Criar `app/admin/login/page.tsx`: lê `callbackUrl` de `searchParams` (validando que começa com `/admin` antes de usar, para evitar open-redirect), renderiza `LoginForm` dentro de um container centralizado (depende de T010)
- [X] T012 [P] [US1] Adicionar em `components/admin/admin.module.css` as classes `.loginPagina`/`.loginCard`/`.loginMarca`/`.loginSaudacao`/`.loginTitulo` reaproveitando `.form`/`.field`/`.formError`/`.btnPrimary` já existentes
- [X] T013 [US1] Criar `proxy.ts` na raiz do projeto (**não** `middleware.ts` — o Next.js 16 renomeou o arquivo para `proxy.ts`, que roda sempre em runtime Node.js; ver nota abaixo): usa `auth` de `lib/auth/config.ts`, chama `rotaExigeAutenticacao` (T005) e, se `protegida && tipoResposta === "redirect"` e não houver sessão, redireciona (302) para `/admin/login?callbackUrl=<pathname original>`; se `protegida && tipoResposta === "json"` e não houver sessão, retorna `401 { erro: "Não autenticado." }`; exportar `config.matcher = ["/admin/:path*"]` (ainda sem as rotas de API — isso é escopo da US2) (depende de T004, T005, T009)

**Checkpoint**: Login funcional de ponta a ponta para as páginas `/admin/**` — acesso sem sessão redireciona; login válido concede acesso; login inválido mostra erro genérico

---

## Phase 4: User Story 2 - Sessão persiste e protege toda navegação no painel (Priority: P1)

**Goal**: Além das páginas, as rotas de API usadas pelo painel para ler/gravar dados (`/api/produtos/**`, `/api/pedidos/[id]/**`) também exigem sessão válida, sem quebrar `POST /api/pedidos` (checkout público).

**Independent Test**: Autenticado, completar um fluxo (editar produto, atualizar status de pedido) sem novo login; sem sessão, chamar diretamente `GET /api/produtos` ou `GET/PATCH /api/pedidos/<id>` deve retornar 401; `POST /api/pedidos` continua funcionando sem sessão.

### Implementation for User Story 2

- [X] T014 [US2] Estender `config.matcher` em `proxy.ts` (T013) para incluir `"/api/produtos/:path*"` e `"/api/pedidos/:path*"` — a lógica de `rotaExigeAutenticacao` (já escrita em T005) já resolve a exceção do `POST /api/pedidos` raiz; nenhuma mudança de lógica além do matcher (depende de T013)
- [X] T015 [P] [US2] Verificação manual: `npm run test` continua com as 147 suítes passando (os `route.test.ts` de `app/api/produtos/**` e `app/api/pedidos/**` testam os handlers diretamente, sem passar pelo proxy) e revisão confirmada — `/api/pagamentos/**`, `/api/webhooks/**`, `/api/estoque/sincronizar`, `/api/estoque/mercado-livre/callback`, `/api/health`, `/api/anuncios/pendencias`, `/api/estoque/pendencias` não estão sob nenhum dos prefixos do `matcher`

**Checkpoint**: Rotas de API administrativas exigem sessão; checkout e integrações externas continuam públicos

---

## Phase 5: User Story 3 - Logout (Priority: P2)

**Goal**: Administrador autenticado consegue encerrar a sessão a partir de qualquer página do painel; após logout, `/admin` volta a exigir login.

**Independent Test**: Autenticado, clicar em "Sair" e em seguida tentar acessar `/admin/produtos` deve redirecionar para o login novamente.

### Implementation for User Story 3

- [X] T016 [P] [US3] Criar `components/admin/SairButton.tsx` (Client Component): botão que chama `signOut({ callbackUrl: "/admin/login" })` do `next-auth/react`
- [X] T017 [US3] Criar `app/admin/(painel)/layout.tsx` (Server Component) — `/admin/produtos` e `/admin/pedidos` foram movidos para o route group `app/admin/(painel)/` (não altera a URL) para que `/admin/login` fique fora do layout sem precisar de `usePathname()`; o layout chama `await auth()` direto (sem `SessionProvider`/`useSession()` — mais simples pois o nome já vem pronto do server) e renderiza a barra superior com o nome do usuário e `SairButton` (depende de T016)
- [X] T018 [P] [US3] Adicionar em `components/admin/admin.module.css` as classes `.topoAdmin`/`.topoAdminConteudo`/`.topoAdminMarca`/`.topoAdminUsuario`

**Checkpoint**: Logout funcional; sessão encerrada exige novo login

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] `npm run test` → 147/147 passando. `npm run lint` **falha por um problema pré-existente, não relacionado a esta tarefa**: o script usa `next lint`, comando removido no Next.js 16 (`npx next --help` não lista mais `lint` entre os comandos), e não há `eslint.config.*`/`.eslintrc*` no repositório — ou seja, lint já estava quebrado antes desta tarefa. Rodei `npx tsc --noEmit` como verificação de tipos (sem erros) no lugar; consertar o `next lint` fica fora do escopo de EDI-86
- [X] T020 Revisado `specs/008-auth-painel-admin/quickstart.md` — passos batem com o implementado (login em `/admin/login`, layout com barra superior movido para `app/admin/(painel)/`, `proxy.ts` em vez de `middleware.ts`); nenhum ajuste de conteúdo necessário além do já registrado em `research.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup — bloqueia todas as user stories
- **US1 (Phase 3)**: depende do Foundational
- **US2 (Phase 4)**: depende de US1 (estende o mesmo `middleware.ts` criado em T013)
- **US3 (Phase 5)**: depende do Foundational; não depende de US2, mas depende de US1 (usa `signIn`/`signOut` do mesmo `lib/auth/config.ts` e faz sentido logout existir só após login existir)
- **Polish (Phase 6)**: depende de todas as stories desejadas estarem completas

### Parallel Opportunities

- T002 pode rodar em paralelo com T001 (arquivos diferentes)
- T003, T005 podem rodar em paralelo entre si (Foundational); T006/T007 podem rodar em paralelo entre si após T004/T005 estarem prontos
- T010 e T012 podem rodar em paralelo (US1)
- T016 e T018 podem rodar em paralelo (US3)

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Setup) e Phase 2 (Foundational)
2. Completar Phase 3 (US1) — já entrega o núcleo da tarefa: sem login, ninguém acessa `/admin`
3. **PARAR e VALIDAR**: seguir `quickstart.md` passos 1-3
4. Completar Phase 4 (US2) para fechar a brecha das rotas de API
5. Completar Phase 5 (US3) para o botão de logout
6. Completar Phase 6 (Polish)

### Incremental Delivery

Cada fase de user story deixa o sistema num estado consistente e testável — não há necessidade de implementar tudo de uma vez antes de validar com o usuário.
