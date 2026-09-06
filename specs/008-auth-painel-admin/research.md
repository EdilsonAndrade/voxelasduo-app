# Research: Autenticação e proteção do painel administrativo

## Decisão 1 — Biblioteca de autenticação

**Decision**: NextAuth.js v5 (pacote `next-auth`, também chamado Auth.js), com o provider `Credentials` (e-mail + senha) e estratégia de sessão `jwt`.

**Rationale**: É a opção citada na própria issue (EDI-86) e é o padrão de mercado para App Router do Next.js — expõe `auth()` (helper server-side, usável em Server Components, Route Handlers e `middleware.ts`) e `signIn`/`signOut` client-side, sem precisar construir o fluxo de sessão manualmente (cookie assinado, CSRF, etc.). Sessão `jwt` evita criar uma coleção de sessões no Mongo (decisão já validada com o usuário) — o token fica só no cookie, verificado via assinatura (edge-safe, usa `jose` internamente).

**Alternatives considered**:
- **Sessão manual com cookie assinado próprio** (`jose`/`iron-session` direto): mais controle, mas reimplementa o que o NextAuth já resolve (CSRF, rotação de cookie, integração com middleware) para um ganho não perceptível num painel de 1-2 usuários.
- **`@auth/mongodb-adapter` (database sessions)**: descartado nesta tarefa — decisão já validada com o usuário de usar JWT stateless.

## Decisão 2 — Onde ficam os administradores

**Decision**: Nova coleção `usuarios` no MongoDB (mesmo banco `voxelasduo` das demais coleções), com `email`, `senhaHash` (bcrypt) e `nome`. Cadastro feito por um script de seed (`scripts/seed-admin.ts`, rodado manualmente via `npm run seed:admin -- <email> <senha> <nome>`), no mesmo padrão do `scripts/seed.ts` já existente (dotenv + conexão direta ao Mongo, sem subir servidor).

**Rationale**: Decisão já validada com o usuário ("seed manual no Mongo"). Reaproveita a infraestrutura de conexão (`lib/db/mongodb.ts`) e o padrão de script já usado no projeto. Permite trocar a senha de um administrador depois (rodando o script de novo com upsert) sem precisar de tela de gestão de usuários — fora do escopo desta tarefa.

**Alternatives considered**:
- **Variáveis de ambiente com credenciais fixas**: mais simples, mas exige redeploy pra trocar senha e não escala nem para 2 usuários com senhas diferentes de forma limpa. Rejeitado no diálogo de esclarecimento com o usuário.
- **Tela de registro com convite**: over-engineering para 1-2 usuários fixos (a issue já lista os administradores como conhecidos). Rejeitado no mesmo diálogo.

## Decisão 3 — Hash de senha

**Decision**: `bcryptjs` (implementação pura em JavaScript do bcrypt).

**Rationale**: O NextAuth Credentials `authorize()` e o script de seed rodam em runtime Node.js (Serverless Function / script local), então bcrypt de qualquer sabor funciona; `bcryptjs` evita depender de binding nativo (`bcrypt`), que historicamente já causou dor de cabeça em builds serverless (é preciso rebuild da lib nativa para a plataforma alvo). Para 1-2 usuários e login pouco frequente, a diferença de performance entre as duas é irrelevante.

**Alternatives considered**:
- **`bcrypt` (nativo)**: mais rápido, mas adiciona risco de build (binário nativo) sem necessidade real aqui.
- **`argon2`**: hash mais moderno, mas adiciona outra dependência nativa sem ganho relevante para este caso de uso de baixíssimo volume.

## Decisão 4 — Onde aplicar a proteção

**Decision**: Um único `proxy.ts` na raiz do projeto (**nota da implementação**: o Next.js 16 renomeou o arquivo `middleware.ts` para `proxy.ts` — o antigo nome ainda é aceito, mas `proxy.ts` roda sempre em runtime Node.js, sem precisar de nenhuma configuração extra, o que é ainda melhor para este caso pois `authorize()` usa `mongodb`/`bcryptjs`), usando o helper `auth()` do NextAuth como wrapper do handler, com `matcher` cobrindo:
- `/admin/:path*` (todas as páginas do painel, existentes e futuras)
- `/api/produtos/:path*` (toda a família de rotas de produto — hoje só consumida pelo painel: CRUD, upload de foto, publicação no Mercado Livre)
- `/api/pedidos/:path*` (detalhe e atualização de status de um pedido — `GET`/`PATCH` em `/api/pedidos/[id]`)

Dentro do middleware, uma exceção pontual: `POST /api/pedidos` (raiz, sem `id`) continua público — é a rota usada pelo checkout do cliente para criar um pedido nunca autenticado. O middleware deixa passar quando `pathname === "/api/pedidos" && method === "POST"`; qualquer outra combinação sob esses prefixos exige sessão.

**Rationale**: Um único ponto de checagem (middleware) é mais simples de auditar do que repetir a checagem em cada Route Handler, e é exatamente o padrão recomendado pelo NextAuth v5 para Next.js App Router. A exceção do `POST /api/pedidos` é necessária porque essa rota atende dois públicos (cliente fazendo checkout e o próprio código do painel não a consome — confirmado: `PedidosLista.tsx` não busca a listagem via fetch, ela já vem do Server Component `app/admin/pedidos/page.tsx`).

**Alternatives considered**:
- **Checagem de sessão dentro de cada Route Handler** (`const session = await auth()` no topo de cada `GET/POST/PATCH`): funciona, mas duplica a lógica em ~6 arquivos e é mais fácil esquecer de proteger uma rota nova. Rejeitado em favor do middleware central; ainda assim, novas rotas administrativas devem nascer sob `/api/produtos/**` ou `/api/pedidos/[id]/**` (ou um novo prefixo adicionado ao matcher) para herdar a proteção automaticamente.
- **Proteger `/api/pedidos/:path*` inteiro sem exceção**: quebraria o checkout (`FormularioCheckout.tsx` faz `POST /api/pedidos` sem sessão). Rejeitado.

**Fora do escopo desta tarefa** (não wireados a nenhuma página `/admin` hoje, então não fazem parte de FR-006): `/api/anuncios/pendencias`, `/api/estoque/pendencias` — endpoints de leitura administrativa já existentes mas ainda não consumidos por nenhuma tela; ficam registrados aqui como dívida a considerar numa tarefa futura caso ganhem uma tela própria.

## Decisão 5 — Tela de login

**Decision**: Nova rota pública `app/admin/login/page.tsx` (fora da proteção do middleware — precisa ser acessível sem sessão), Client Component com formulário de e-mail/senha chamando `signIn("credentials", { email, senha, redirectTo, redirect: false })` do `next-auth/react`, reaproveitando as classes já existentes em `components/admin/admin.module.css` (`.form`, `.field`, `.formError`, `.btnPrimary`).

**Rationale**: Mantém consistência visual com o restante do admin (`ProdutoForm.tsx` já usa esse padrão de formulário) em vez de criar um design novo do zero.

## Decisão 6 — Logout

**Decision**: Um `app/admin/layout.tsx` novo (ainda não existe) que envolve todas as páginas de `/admin` com o `SessionProvider` do NextAuth e uma barra superior fixa com o nome do administrador logado + botão "Sair" (`signOut()`).

**Rationale**: Centraliza o botão de logout em um único lugar em vez de duplicá-lo em cada página (`produtos`, `pedidos`, futuras), e é o ponto natural para prover o `SessionProvider` exigido pelos hooks client-side do NextAuth (`useSession`, `signOut`).
