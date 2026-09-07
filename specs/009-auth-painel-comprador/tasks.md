# Tasks: Autenticação e painel do comprador (cliente)

**Input**: Design documents from `specs/009-auth-painel-comprador/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-cliente-api.md, contracts/email-transacional.md, quickstart.md

**Tests**: Incluídos — plan.md pede testes unitários (Vitest) para autorização, unificação de contas, código de recuperação, query de "Meus Pedidos" e envio de e-mail, seguindo o padrão já usado no projeto (`*.test.ts` ao lado do código, sem `jsdom`/testing-library — `environment: "node"`).

**Organization**: Tarefas agrupadas por user story (spec.md). Ordem das fases segue prioridade (P1 → P2 → P3), com uma reordenação dentro do P1: US4 (associar pedido) vem antes de US3 ("Meus Pedidos") porque a listagem depende da associação existir primeiro para ter o que mostrar.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa ainda não concluída)
- **[Story]**: US1 (Cadastro/login), US2 (Recuperação de senha), US3 ("Meus Pedidos"), US4 (Pedido associado à conta, inclusive convidado), US5 (Dados cadastrais/endereços), US6 (Notificação ao admin)

---

## Phase 1: Setup

**Purpose**: Preparar dependências e configuração antes de qualquer código novo

- [X] T001 Adicionar `resend` às `dependencies` em `package.json`; rodar `npm install` — `resend@^6.26.0`
- [X] T002 [P] Adicionar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_CLIENTE_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICACAO_EMAIL` em `.env.example`, com comentários explicando origem/propósito de cada uma — já feito nesta sessão de planejamento

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de autenticação do cliente, modelo de dados e e-mail transacional, compartilhados por todas as user stories

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase estar completa

- [X] T003 [P] Criar `lib/models/cliente.ts`: interface `Cliente` (`_id`, `nome`, `email`, `senhaHash?`, `googleId?`, `telefone?`, `endereco?`, `recuperacaoSenha?`, `criadoEm`, `atualizadoEm`) e `export const CLIENTES_COLLECTION = "clientes"`, conforme `data-model.md`
- [X] T004 [P] Estender `lib/models/pedido.ts`: `StatusPedido`/`STATUS_PEDIDO` ganham `"em_producao"` e `"entregue"`; `Pedido` ganha `clienteId?: ObjectId` e `rastreio?: { codigo: string; transportadora: string }`, conforme `data-model.md` — inclui ajuste em `components/admin/PedidosLista.tsx`/`admin.module.css` (labels/badges dos 2 novos status) para manter o `tsc --noEmit` limpo
- [X] T005 Criar `lib/clientes/repository.ts`: `colecaoClientes()` (garante índice único em `email`), `buscarClientePorEmail(email)`, `criarClienteCredenciais({ nome, email, senhaHash })` (falha se já existir `senhaHash` para o e-mail — US1 AC3), `criarOuUnificarClienteGoogle({ nome, email, googleId })` (busca por e-mail normalizado; existe ⇒ grava `googleId` no documento existente; não existe ⇒ cria novo), conforme `data-model.md` e research.md #2 (depende de T003)
- [X] T006 [P] Criar `lib/clientes/repository.test.ts`: cobre criação nova por credentials, criação nova por Google, unificação Google→conta já existente por senha, unificação credentials→conta já existente por Google, e-mail duplicado via credentials (mock do driver do MongoDB, mesmo padrão de `lib/auth/config.ts`)
- [X] T007 [P] Criar `lib/auth/autorizarCredenciaisCliente.ts` + `lib/auth/autorizarCredenciaisCliente.test.ts`: busca por `email` normalizado via `buscarClientePorEmail` (T005), compara `senha` com `senhaHash` via `bcrypt.compare`, retorna `null` se não houver `senhaHash` (conta só-Google) ou credenciais incorretas — mesmo padrão de `lib/auth/autorizarCredenciais.ts` do admin (depende de T005)
- [X] T008 Criar `lib/auth/clienteConfig.ts`: segunda instância do NextAuth v5 (`NextAuth({...})`), `basePath: "/api/auth/cliente"`, cookie de sessão com nome próprio, `session: { strategy: "jwt" }`, `pages: { signIn: "/entrar" }`, providers `Credentials` (delega para `autorizarCredenciaisCliente`, T007) e `Google`; callback `signIn` do provider Google chama `criarOuUnificarClienteGoogle` (T005); callbacks `jwt`/`session` incluem `id`/`nome` na sessão; exportar `handlers`, `auth`, `signIn`, `signOut` (depende de T005, T007)
- [X] T009 [P] Criar `app/api/auth/cliente/[...nextauth]/route.ts` re-exportando `GET`/`POST` de `handlers` de `lib/auth/clienteConfig.ts` (depende de T008)
- [X] T010 [P] Criar `lib/auth/rotaProtegidaCliente.ts` + `lib/auth/rotaProtegidaCliente.test.ts`: função pura `rotaClienteExigeAutenticacao(pathname, method)` implementando a matriz do `contracts/auth-cliente-api.md` (mesmo padrão de `lib/auth/rotaProtegida.ts` do admin)
- [X] T011 Estender `proxy.ts` — implementado com `getToken` de `next-auth/jwt` (research.md #9c) em vez de um segundo `auth(...)` HOF, já que o HOF do admin já ocupa o handler default do arquivo; mesmo comportamento de redirect/401 e mesma extensão de `config.matcher` descritos (depende de T008, T010)
- [X] T012 Criar `lib/email/resend.ts`: cliente do Resend (`new Resend(process.env.RESEND_API_KEY)`), `enviarCodigoRecuperacao(email: string, codigo: string): Promise<void>` e `notificarAdminVendaExterna(pedido: Pedido): Promise<void>`, conforme `contracts/email-transacional.md` — falha de envio é logada (`console.error`) e nunca lança (depende de T001)
- [X] T013 [P] Criar `lib/email/resend.test.ts`: mock do client do Resend (`resend.emails.send`), cobre assunto/destinatário/corpo de cada função e que uma falha do mock não lança exceção

**Checkpoint**: Segunda instância do NextAuth, modelo de cliente, proteção de rotas e envio de e-mail prontos e cobertos por teste — nenhuma UI ainda

---

## Phase 3: User Story 1 - Cadastro e login do cliente (Priority: P1) 🎯 MVP

**Goal**: Uma pessoa cria conta por e-mail/senha ou entra com Google, consegue logar de novo com o mesmo método, e as duas formas de entrar se unificam quando usam o mesmo e-mail.

**Independent Test**: Criar conta por e-mail/senha e logar de novo com ela; entrar com Google usando o mesmo e-mail de uma conta já criada por senha e verificar que autentica na mesma conta (sem duplicar).

- [X] T014 Invocado `frontend-design` (extensão fiel do sistema visual existente: Baloo 2/Nunito/Caveat, tokens de cor já definidos, padrão `.secao`/`.campo`/`.input`/`.submit` do checkout reaproveitado; sinal próprio: divisor "ou" + botão Google outline pill) e `site-architecture` (sem item novo no header além de "Entrar"/"Minha conta"; sem breadcrumbs — site é raso; 2 páginas de `/minha-conta` navegáveis por link simples, não abas elaboradas)
- [X] T015 [P] [US1] Criar `lib/clientes/validacaoCadastro.ts` + `.test.ts`
- [X] T016 [US1] Criar `app/api/clientes/route.ts` (POST)
- [X] T017 [P] [US1] Criar `components/cliente/FormularioCadastro.tsx` — via `fetch("/api/clientes")` direto (o Route Handler já faz validação+criação+signIn; não há necessidade de uma Server Action intermediária aqui)
- [X] T018 [US1] Criar `app/(loja)/cadastro/page.tsx` renderizando `FormularioCadastro` (depende de T017)
- [X] T019 [P] [US1] Criar `components/cliente/FormularioLogin.tsx` — credenciais via Server Action `entrarComCredenciais` (`lib/auth/clienteActions.ts`, novo) que chama `signIn` de `clienteConfig.ts` (research.md #9b); Google via `<form action={entrarComGoogle.bind(null, callbackUrl)}>` (mesmo arquivo de actions)
- [X] T020 [US1] Criar `app/(loja)/entrar/page.tsx`
- [X] T021 [US1] Criar `app/(loja)/layout.tsx`
- [X] T022 [US1] Estender `components/SiteHeader.tsx` (virou `async function`, continua Server Component) — exibe "Entrar" (deslogado) ou "Minha conta" (logado)
- [X] T023 [P] [US1] Criar `components/cliente/cliente.module.css`

**Checkpoint**: Cadastro, login por e-mail/senha, login Google e unificação de contas funcionam de ponta a ponta

---

## Phase 4: User Story 4 - Compra associada à conta, inclusive como convidado (Priority: P1)

**Goal**: Compra no site (autenticada ou como convidado, sempre com e-mail) fica associada — direta ou, para convidado, por correspondência de e-mail ao criar conta depois.

**Independent Test**: Autenticado, comprar e conferir associação direta (`clienteId` gravado); comprar como convidado com um e-mail e, depois, criar conta com o mesmo e-mail — o pedido deve ficar alcançável pela query de "Meus Pedidos" (validado de fato na US3, mas a query em si é testável isoladamente aqui).

- [X] T024 [US4] Estender `lib/pedidos/repository.ts`: `CriarPedidoInput` ganha `clienteId?: ObjectId` opcional; `criarPedido` grava o campo no documento quando presente
- [X] T025 [US4] Estender `app/api/pedidos/route.ts` (POST): chama `auth()` de `lib/auth/clienteConfig.ts` (leitura opcional, sem exigir — guest checkout continua funcionando sem sessão); se houver sessão de cliente válida, passa `clienteId: session.user.id` para `criarPedido` (T024) (depende de T024, T008)
- [X] T026 [P] [US4] Criar `lib/clientes/pedidosAssociados.ts` + `.test.ts` (comparação de e-mail case-insensitive via regex, já que `Pedido.cliente.email` não é normalizado no checkout, diferente de `Cliente.email`)
- [X] T027 [US4] Verificação manual — **limitação encontrada, documentada em `research.md` (addendum da Decisão 8)**: o webhook do Mercado Livre nunca captura o e-mail real do comprador (só itens/quantidades; a própria API do ML normalmente não expõe e-mail real de comprador), então `upsertPedidoExterno` sempre grava o e-mail placeholder fixo `vendas-externas@voxelasduo.local` — a associação automática por e-mail funciona para convidados do site, mas não conecta pedidos do Mercado Livre a nenhuma conta hoje. Resolver isso é fora do escopo do EDI-84 (exigiria mudar a integração da Tarefa 7/EDI-80); a query de T026 já está pronta para quando essa captura existir

**Checkpoint**: Todo pedido (site autenticado, convidado, ou canal externo) é alcançável pela query de "Meus Pedidos"

---

## Phase 5: User Story 3 - "Meus Pedidos": histórico e acompanhamento (Priority: P1)

**Goal**: Cliente autenticado vê a lista de seus pedidos (qualquer canal), com itens, valor, status e rastreio quando houver; nunca vê pedido de outro cliente.

**Independent Test**: Autenticado com pedidos associados, acessar `/minha-conta/pedidos` e conferir os dados; tentar acessar o detalhe de um pedido de outro cliente pela URL deve ser negado.

- [X] T028 [US3] Criar `app/api/clientes/pedidos/route.ts` (GET)
- [X] T029 [P] [US3] Estender `lib/pedidos/apresentacao.ts` (`rastreio` em `PedidoResumo` e `PedidoDetalhado`)
- [X] T030 [P] [US3] Criar `components/cliente/ListaPedidos.tsx` — inclui sinal visual próprio (trilha de progresso pago→em produção→enviado→entregue, ver `cliente.module.css`)
- [X] T031 [US3] Criar `app/(loja)/minha-conta/pedidos/page.tsx` (depende de T026, T030)
- [X] T032 [US3] Criar `app/(loja)/minha-conta/pedidos/[id]/page.tsx` — posse verificada via `pedidoPertenceAoCliente` (novo, em `lib/clientes/pedidosAssociados.ts`), 404 quando não pertence (FR-014)
- [X] T033 [P] [US3] Estender `components/admin/PedidosLista.tsx`/`admin.module.css` (labels/badges "Em produção"/"Entregue" já feitos em T004) + `app/api/pedidos/[id]/route.ts`/`lib/pedidos/atualizarStatus.ts` (novo `atualizarRastreioPedido`) para o admin registrar código de rastreio/transportadora

**Checkpoint**: "Meus Pedidos" completo — combinado com US1+US4, fecha o MVP real do ticket (conta + histórico de compras)

---

## Phase 6: User Story 2 - Recuperação de senha (Priority: P2)

**Goal**: Cliente que esqueceu a senha recebe um código por e-mail, valida o código e define uma nova senha.

**Independent Test**: Solicitar recuperação para um e-mail com conta de senha existente, receber o código, informá-lo e trocar a senha; logar com a senha nova.

- [X] T034 [P] [US2] Criar `lib/clientes/recuperacaoSenha.ts` + `.test.ts` — mais `definirCodigoRecuperacao`/`redefinirSenhaCliente` novos em `lib/clientes/repository.ts`
- [X] T035 [US2] Criar `app/api/clientes/recuperar-senha/route.ts` (POST)
- [X] T036 [US2] Criar `app/api/clientes/redefinir-senha/route.ts` (POST)
- [X] T037 [P] [US2] Criar `components/cliente/FormularioRecuperarSenha.tsx` + `app/(loja)/recuperar-senha/page.tsx`
- [X] T038 [P] [US2] Criar `components/cliente/FormularioRedefinirSenha.tsx` + `app/(loja)/redefinir-senha/page.tsx`

**Checkpoint**: Recuperação de senha funcional de ponta a ponta

---

## Phase 7: User Story 5 - Dados cadastrais e histórico de endereços (Priority: P3)

**Goal**: Cliente autenticado atualiza telefone/endereço e vê os endereços distintos já usados em compras anteriores.

**Independent Test**: Atualizar telefone/endereço e confirmar persistência; conferir que endereços de pedidos anteriores aparecem no histórico.

- [X] T039 [US5] Criar `app/api/clientes/me/route.ts` (PATCH) — mais `atualizarDadosCliente` novo em `lib/clientes/repository.ts`
- [X] T040 [P] [US5] Criar `app/api/clientes/me/enderecos/route.ts` (GET) — mais `derivarHistoricoEnderecos` novo em `lib/clientes/pedidosAssociados.ts` (+ testes)
- [X] T041 [P] [US5] Criar `components/cliente/FormularioDadosCadastrais.tsx`
- [X] T042 [US5] Criar `app/(loja)/minha-conta/page.tsx` (Server Component, busca direto sem round-trip HTTP) usando `FormularioDadosCadastrais` (depende de T039, T040, T041)

**Checkpoint**: Cliente consegue editar cadastro e ver histórico de endereços

---

## Phase 8: User Story 6 - Notificação do admin em venda de canal externo (Priority: P3)

**Goal**: Admin recebe e-mail sempre que uma venda de canal externo é sincronizada.

**Independent Test**: Forçar uma notificação de venda do Mercado Livre e confirmar o e-mail recebido; reenviar a mesma notificação não deve gerar um segundo e-mail.

- [X] T043 [US6] Estender `app/api/webhooks/mercado-livre/pedidos/route.ts`
- [X] T044 [P] [US6] Estender `app/api/webhooks/mercado-livre/pedidos/route.test.ts` (nota: por causa da limitação de T027, `pedido.cliente.email` recebido aqui é sempre o placeholder — a notificação ao admin funciona normalmente, só a associação a uma conta de cliente que fica sem efeito prático)

**Checkpoint**: Admin notificado por e-mail em toda venda de canal externo sincronizada

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T045 [P] `npm run test` → 196/196 passando; `npx tsc --noEmit` sem erros. `npm run lint` continua quebrado pelo mesmo motivo pré-existente já registrado no polish da Tarefa 9 (`next lint` foi removido no Next.js 16, sem `eslint.config.*` no repo) — fora do escopo do EDI-84
- [X] T046 Revisado `specs/009-auth-painel-comprador/quickstart.md` — passos batem com o implementado; nenhum ajuste necessário

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup — bloqueia todas as user stories
- **US1 (Phase 3)**: depende do Foundational
- **US4 (Phase 4)**: depende do Foundational; não depende de US1 no código (checkout já é público), mas só faz sentido "de ponta a ponta" com US1 existindo (para haver conta a associar)
- **US3 (Phase 5)**: depende do Foundational e de US4 (usa `buscarPedidosDoCliente`, T026) e de US1 (precisa de conta/sessão para ter algo a listar)
- **US2 (Phase 6)**: depende do Foundational e de US1 (só faz sentido recuperar senha de uma conta que já pode ser criada)
- **US5 (Phase 7)**: depende do Foundational, de US1 e de US4/US3 (histórico de endereços deriva de `buscarPedidosDoCliente`, T026)
- **US6 (Phase 8)**: depende só do Foundational (T012) — completamente independente das demais stories
- **Polish (Phase 9)**: depende de todas as stories desejadas estarem completas

### Parallel Opportunities

- T003 e T004 podem rodar em paralelo (Foundational, arquivos diferentes)
- T006, T007, T009, T010, T013 podem rodar em paralelo entre si após suas dependências diretas estarem prontas
- T015, T017, T019, T023 podem rodar em paralelo (US1)
- T026 (US4) pode começar em paralelo com o fim de US1, já que só depende do Foundational
- T029, T030, T033 podem rodar em paralelo (US3)
- T037, T038 podem rodar em paralelo (US2)
- T040, T041 podem rodar em paralelo (US5)
- T044 pode rodar em paralelo com o restante de US6 (só depende de T043 estar descrito, não de outro arquivo)
- **US6 inteira (Phase 8) pode ser feita em qualquer momento após o Foundational**, em paralelo com qualquer outra story, por não ter nenhuma dependência sobre `Cliente`/sessão

---

## Implementation Strategy

### MVP First (US1 + US4 + US3 — os três P1)

1. Completar Phase 1 (Setup) e Phase 2 (Foundational)
2. Completar Phase 3 (US1) — conta e login
3. Completar Phase 4 (US4) — pedidos passam a poder ser associados
4. Completar Phase 5 (US3) — "Meus Pedidos" exibível
5. **PARAR e VALIDAR**: seguir `quickstart.md` passos 1-2, 4-5
6. Completar Phase 6 (US2), Phase 7 (US5), Phase 8 (US6) na ordem que fizer sentido (US6 pode ser feita a qualquer momento, é independente)
7. Completar Phase 9 (Polish)

### Incremental Delivery

Cada fase de user story deixa o sistema num estado consistente e testável. US6 (notificação ao admin) pode inclusive ser entregue antes das demais, já que não depende de nenhuma parte da autenticação do cliente.

---

## Phase 10: Correções pós-implementação (feedback do usuário após teste manual)

Sem user story própria — correções pontuais a US1 (cadastro/login) e às telas de endereço, atuadas diretamente após entendimento com o usuário (research.md #11).

- [X] T047 Verificação de e-mail obrigatória no cadastro por senha: `Cliente.emailVerificado`/`verificacaoEmail` (modelo), `lib/clientes/verificacaoEmail.ts` (+ testes), `ContaNaoVerificadaError` em `autorizarCredenciaisCliente.ts`, `app/api/clientes/route.ts` (não autentica mais direto), `app/api/clientes/verificar-email/route.ts` e `.../reenviar-verificacao/route.ts` (novas), página `/verificar-email` + `FormularioVerificarEmail.tsx`, `FormularioLogin.tsx` orientando para verificar quando aplicável
- [X] T048 Logout visível: `components/cliente/SairClienteButton.tsx` (novo), usado em `SiteHeader.tsx` e `MinhaContaNav.tsx`
- [X] T049 Busca de endereço por CEP com fallback: `lib/cep/buscarEnderecoPorCep.ts` (ViaCEP + BrasilAPI, + testes), campo CEP movido para primeiro em `FormularioCheckout.tsx` e `FormularioDadosCadastrais.tsx`, com autopreenchimento
- [X] T050 [P] Corrigido bug de CSS na lista "endereços já usados" (`.subtitulo` com margin negativo reaproveitado por engano em `<li>`) — `.enderecosLista`/`.enderecoItem` novas em `cliente.module.css`

**Checkpoint**: `npm run test` (209/209) e `npx tsc --noEmit` limpos após as 4 correções
