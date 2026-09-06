# Data Model: Autenticação e proteção do painel administrativo

## Usuario (novo)

Coleção: `usuarios`

| Campo        | Tipo       | Obrigatório | Notas |
|--------------|------------|-------------|-------|
| `_id`        | ObjectId   | gerado      | |
| `email`      | string     | sim         | identificador de login; único (índice único); normalizado em minúsculas antes de gravar/comparar |
| `senhaHash`  | string     | sim         | hash bcrypt da senha — nunca armazenar/logar a senha em texto puro |
| `nome`       | string     | sim         | nome de exibição na barra do painel (ex: "Edilson", "filha") |
| `criadoEm`   | Date       | sim         | |
| `atualizadoEm` | Date     | sim         | atualizado quando a senha é trocada via novo seed |

**Validações**:
- `email` deve ser único na coleção (índice `{ email: 1 }, { unique: true }`).
- `senhaHash` nunca é aceito como entrada externa — só é gerado internamente pelo script de seed (bcrypt) e comparado no `authorize()` do Credentials provider.

**Relacionamentos**: nenhum — entidade isolada, sem referência a `Produto`/`Pedido`. Não tem papéis/permissões (fora de escopo — FR-010).

**Ciclo de vida**: criado/atualizado exclusivamente pelo script `scripts/seed-admin.ts` (upsert por `email`). Sem exclusão nem edição pela interface do site (sem tela de gestão de usuários nesta tarefa).

## Sessão (gerenciada pelo NextAuth — não é uma coleção própria)

Representa o estado "autenticado" de um `Usuario`, materializado como um cookie JWT assinado (estratégia `jwt` do NextAuth — sem coleção `sessions` no Mongo). Contém minimamente: `sub`/`id` do usuário, `email`, `nome`, `exp` (expiração).

**Validações/regras**:
- Gerada apenas após `authorize()` confirmar e-mail + senha (hash) válidos.
- Verificada em toda requisição para `/admin/**`, `/api/produtos/**` e `/api/pedidos/[id]/**` (ver `research.md`, Decisão 4); ausência ou expiração ⇒ tratada como não autenticado.
- Invalidada client-side por `signOut()` (remove o cookie); não há lista de revogação server-side (compatível com estratégia stateless já validada com o usuário).
