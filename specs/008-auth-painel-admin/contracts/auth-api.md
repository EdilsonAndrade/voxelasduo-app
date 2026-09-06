# Contract: Autenticação

## `POST /api/auth/callback/credentials` (gerado pelo NextAuth a partir de `app/api/auth/[...nextauth]/route.ts`)

Chamado internamente por `signIn("credentials", { email, senha })` — não é chamado diretamente pelo código da aplicação, mas documentado aqui como contrato observável pelo formulário de login.

**Request body** (form-encoded, gerado pelo `next-auth/react`):
```
email: string
senha: string
```

**Responses**:
- Sucesso: redireciona/retorna sessão válida (cookie de sessão setado); `signIn` client-side resolve com `{ ok: true, error: null }`.
- Falha (e-mail não encontrado OU senha incorreta): `authorize()` retorna `null` ⇒ `signIn` client-side resolve com `{ ok: false, error: "CredentialsSignin" }`. A tela de login mapeia isso para a mensagem genérica "E-mail ou senha inválidos." (FR-004 — nunca revelar qual dos dois está errado).

## `GET /api/auth/session`

Gerado automaticamente pelo NextAuth. Usado pelo `SessionProvider`/`useSession()` no `app/admin/layout.tsx` para exibir o nome do administrador logado.

**Response** (autenticado):
```json
{ "user": { "email": "...", "name": "..." }, "expires": "2026-..." }
```

**Response** (não autenticado): `{}`

## `POST /api/auth/signout`

Gerado automaticamente pelo NextAuth, acionado por `signOut()` no botão "Sair". Encerra a sessão (remove o cookie).

---

## Middleware de proteção (não é uma rota nova — comportamento transversal)

Arquivo: `middleware.ts` (raiz do projeto).

| Rota alvo | Método | Comportamento sem sessão válida |
|---|---|---|
| `/admin/**` (exceto `/admin/login`) | qualquer | Redireciona (302) para `/admin/login?callbackUrl=<rota original>` |
| `/api/produtos` e subrotas (`/api/produtos/**`) | qualquer | `401 { "erro": "Não autenticado." }` |
| `/api/pedidos/[id]` e subrotas | qualquer | `401 { "erro": "Não autenticado." }` |
| `/api/pedidos` (raiz) | `POST` | **Não protegido** — usado pelo checkout público |
| `/api/pedidos` (raiz) | outros métodos (`GET`) | `401 { "erro": "Não autenticado." }` |

Com sessão válida, o middleware deixa a requisição seguir normalmente (não injeta nada além do cookie de sessão já presente).
