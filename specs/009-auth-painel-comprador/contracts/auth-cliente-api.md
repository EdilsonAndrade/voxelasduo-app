# Contract: Autenticação do cliente

Segunda instância do NextAuth (`lib/auth/clienteConfig.ts`), `basePath: "/api/auth/cliente"`, totalmente separada da instância do admin (research.md #1). Rotas geradas automaticamente por `app/api/auth/cliente/[...nextauth]/route.ts`.

## `POST /api/auth/cliente/callback/credentials`

Chamado internamente por `signIn("credentials", { email, senha })` no formulário de `/entrar`. Se `email` já existir com `googleId` mas sem `senhaHash`, `authorize()` retorna `null` (mensagem genérica — evita revelar que o e-mail existe só via Google).

**Responses**: mesmo padrão do contrato do admin (`ok:true`/sessão válida, ou `CredentialsSignin` ⇒ mensagem genérica "E-mail ou senha inválidos.").

## `POST /api/auth/cliente/callback/google`

Fluxo OAuth padrão do NextAuth. No callback `signIn`, busca `Cliente` por e-mail normalizado:
- Existe com `senhaHash` (sem `googleId`) ⇒ unifica: grava `googleId` no documento existente, mesma conta.
- Não existe ⇒ cria novo `Cliente` só com `googleId` e o `nome`/`email` retornados pelo Google.
- Existe já com `googleId` ⇒ login normal.

## `POST /api/clientes` (cadastro por e-mail/senha)

**Request body**:
```json
{ "nome": "string", "email": "string", "senha": "string" }
```

**Responses**:
- `201`: cliente criado (ou unificado com conta Google existente do mesmo e-mail) e autenticado.
- `409 { "erro": "E-mail já cadastrado." }`: já existe cliente com `senhaHash` para esse e-mail (US1, Acceptance Scenario 3).
- `400 { "erro": "Dados inválidos.", "campos": {...} }`: validação (nome/e-mail/senha ausentes ou mal formados).

## `POST /api/clientes/recuperar-senha`

**Request body**: `{ "email": "string" }`

**Response**: sempre `200 { "ok": true }`, independentemente de o e-mail existir ou não (FR-008/Edge Cases — não vazar quais e-mails têm conta). Se existir cliente com `senhaHash` para esse e-mail, gera e envia o código (research.md #3); caso contrário, não faz nada.

## `POST /api/clientes/redefinir-senha`

**Request body**: `{ "email": "string", "codigo": "string", "novaSenha": "string" }`

**Responses**:
- `200 { "ok": true }`: código correto e não expirado ⇒ `senhaHash` atualizado, `recuperacaoSenha` removido.
- `400 { "erro": "Código inválido ou expirado." }`: código incorreto, ausente ou `expiraEm` no passado.

## `GET /api/clientes/pedidos` ("Meus Pedidos")

Exige sessão de cliente válida (senão `401`). Retorna os pedidos do cliente autenticado (query descrita em `data-model.md`), mais recentes primeiro, com itens, valor, status, canal de origem e `rastreio` quando presente.

## `PATCH /api/clientes/me` (atualizar cadastro)

Exige sessão de cliente válida. **Request body**: `{ "telefone"?: "string", "endereco"?: {...} }`. Atualiza somente os campos enviados.

## `GET /api/clientes/me/enderecos` (histórico de endereços)

Exige sessão de cliente válida. Retorna a lista de endereços distintos usados pelo cliente (derivado, `data-model.md`).

---

## Middleware de proteção do cliente (extensão do `proxy.ts` existente)

O mesmo `proxy.ts` (raiz) passa a checar também a sessão do cliente para as rotas abaixo, além da checagem já existente para `/admin/**` (Tarefa 9) — cada bloco usa a instância de `auth()` correspondente (admin ou cliente), sem se misturarem.

| Rota alvo | Sessão exigida | Sem sessão válida |
|---|---|---|
| `/minha-conta/**` | Cliente | Redireciona (302) para `/entrar?callbackUrl=<rota original>` |
| `/api/clientes/pedidos`, `/api/clientes/me`, `/api/clientes/me/enderecos` | Cliente | `401 { "erro": "Não autenticado." }` |
| `/api/clientes` (POST — cadastro), `/api/clientes/recuperar-senha`, `/api/clientes/redefinir-senha` | Nenhuma (públicas) | N/A |
| `POST /api/pedidos` (checkout) | Nenhuma (continua público, guest checkout) | N/A — quando há sessão de cliente válida, o handler associa `clienteId` por conta própria (não é o middleware que decide isso) |
