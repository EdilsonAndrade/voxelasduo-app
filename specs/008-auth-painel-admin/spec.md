# Feature Specification: Autenticação e proteção do painel administrativo

**Feature Branch**: `edilsonaandrade/edi-86-tarefa-9-autenticacao-e-protecao-do-painel-administrativo`
**Created**: 2026-09-06
**Status**: Draft
**Input**: User description: "Autenticação e proteção do painel administrativo (Linear EDI-86, parent EDI-73). Implementar login para proteger todas as áreas administrativas (/admin/produtos, /admin/pedidos e demais rotas /admin futuras)... Usuários administradores (o usuário e/ou a filha) são cadastrados via seed manual em uma coleção de usuários no MongoDB, com senha armazenada como hash. Rotas /admin (e as rotas de API que elas usam para mutação) devem exigir sessão autenticada; usuário não autenticado que tentar acessar /admin é redirecionado para uma tela de login. Deve existir uma ação de logout. Fora de escopo: recuperação de senha por e-mail, múltiplos níveis de permissão/roles, auto-registro de novos administradores."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login para acessar o painel administrativo (Priority: P1)

Um administrador (o usuário ou a filha) acessa uma URL do painel administrativo (ex: `/admin/produtos`) sem estar autenticado. O sistema o redireciona para uma tela de login, onde ele informa e-mail e senha cadastrados previamente. Após autenticação bem-sucedida, ele é levado à página que originalmente tentou acessar.

**Why this priority**: Sem isso, não existe proteção nenhuma — é o núcleo da tarefa (fechar a dívida registrada nas Tarefas 8/EDI-81 e no painel de produtos, onde hoje qualquer pessoa com a URL acessa `/admin`).

**Independent Test**: Pode ser testado sozinho: sem sessão, acessar `/admin/produtos` deve sempre cair na tela de login; informando credenciais válidas de um usuário previamente cadastrado, o acesso é concedido.

**Acceptance Scenarios**:

1. **Given** nenhum usuário autenticado, **When** o administrador acessa `/admin/produtos` ou `/admin/pedidos`, **Then** o sistema o redireciona para a tela de login.
2. **Given** a tela de login exibida, **When** o administrador informa e-mail e senha corretos de um usuário cadastrado, **Then** o sistema concede acesso e o leva à página do painel que ele tentou acessar originalmente.
3. **Given** a tela de login exibida, **When** o administrador informa e-mail ou senha incorretos, **Then** o sistema exibe uma mensagem de erro genérica (sem indicar se o e-mail existe ou não) e permanece na tela de login.

---

### User Story 2 - Sessão persiste e protege toda navegação no painel (Priority: P1)

Depois de autenticado, o administrador navega livremente entre as diferentes telas do painel (`/admin/produtos`, `/admin/pedidos`, cadastro/edição de produto, atualização de status de pedido) sem precisar logar novamente a cada página, incluindo ao atualizar dados (criar produto, editar produto, mudar status de pedido).

**Why this priority**: Proteger apenas a página de listagem e deixar as rotas de mutação (ex: `PATCH /api/pedidos/[id]`, salvar produto) abertas anularia a proteção — é tão crítico quanto o login em si.

**Independent Test**: Autenticado, o administrador consegue completar um fluxo de ponta a ponta (ex: editar um produto e salvar) sem novos pedidos de login; chamando diretamente uma rota de API administrativa sem sessão válida (ex: via ferramenta externa), a requisição é recusada.

**Acceptance Scenarios**:

1. **Given** um administrador autenticado, **When** ele navega entre as páginas do painel, **Then** ele permanece autenticado sem precisar logar novamente, dentro do período de validade da sessão.
2. **Given** um administrador autenticado, **When** ele cria/edita um produto ou atualiza o status de um pedido, **Then** a operação é aceita normalmente.
3. **Given** nenhuma sessão válida, **When** uma requisição é feita diretamente a uma rota de API administrativa de mutação (ex: salvar produto, atualizar status de pedido), **Then** o sistema recusa a operação sem executá-la.

---

### User Story 3 - Logout (Priority: P2)

O administrador autenticado aciona uma opção de "sair" visível no painel. O sistema encerra a sessão e, em qualquer tentativa seguinte de acessar `/admin`, volta a exigir login.

**Why this priority**: Importante para uso em computador compartilhado ou ao final do expediente, mas não bloqueia o valor central (proteger o acesso) entregue pelas User Stories 1 e 2.

**Independent Test**: Pode ser testado isoladamente: autenticado, acionar "sair" e, em seguida, tentar acessar `/admin/produtos` deve redirecionar novamente para o login.

**Acceptance Scenarios**:

1. **Given** um administrador autenticado, **When** ele aciona a opção de logout, **Then** a sessão é encerrada e ele é redirecionado para a tela de login (ou página pública).
2. **Given** uma sessão já encerrada por logout, **When** o administrador (ou qualquer pessoa usando o mesmo navegador) tenta acessar novamente `/admin`, **Then** o sistema exige login novamente.

### Edge Cases

- O que acontece se alguém tentar acessar diretamente uma URL de API administrativa (não uma página) sem estar autenticado? → Deve ser recusado (resposta de erro de autenticação), sem vazar dados.
- O que acontece se a sessão expirar enquanto o administrador está com o painel aberto e ele tenta salvar algo? → A operação deve ser recusada e o usuário deve ser levado de volta ao login.
- O que acontece se o e-mail informado no login não corresponder a nenhum administrador cadastrado? → Mesma mensagem de erro genérica do caso de senha incorreta (não revelar quais e-mails existem).
- O que acontece com as rotas públicas do site (catálogo, carrinho, checkout)? → Não são afetadas; a exigência de login vale apenas para `/admin` e para as rotas de API que essas páginas usam para ler/gravar dados administrativos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE exigir autenticação para acessar qualquer rota sob `/admin` (existente ou futura), incluindo `/admin/produtos` e `/admin/pedidos`.
- **FR-002**: O sistema DEVE redirecionar um usuário não autenticado que tentar acessar uma rota de `/admin` para uma tela de login, preservando a página originalmente solicitada para redirecionamento após o login bem-sucedido.
- **FR-003**: O sistema DEVE permitir login via e-mail e senha de um administrador previamente cadastrado.
- **FR-004**: O sistema DEVE exibir uma mensagem de erro genérica em caso de e-mail ou senha inválidos, sem indicar qual dos dois está incorreto nem se o e-mail existe.
- **FR-005**: O sistema DEVE armazenar a senha de cada administrador de forma protegida (hash), nunca em texto puro.
- **FR-006**: O sistema DEVE exigir sessão autenticada válida também nas rotas de API usadas pelas páginas administrativas para leitura e mutação de dados (ex: listar/salvar produtos, listar/atualizar status de pedidos), recusando a requisição quando não houver sessão válida.
- **FR-007**: O sistema DEVE oferecer uma ação de logout, acessível a partir de qualquer página do painel administrativo, que encerra a sessão ativa.
- **FR-008**: Após logout ou expiração de sessão, o sistema DEVE voltar a exigir login para qualquer acesso subsequente a `/admin`.
- **FR-009**: O cadastro de administradores é feito fora da interface do site (procedimento manual/script de seed) — o sistema NÃO DEVE expor nenhuma tela pública de auto-registro de novos administradores.
- **FR-010**: O sistema NÃO PRECISA implementar recuperação de senha por e-mail nem múltiplos níveis de permissão/papéis nesta tarefa — todo administrador autenticado tem acesso igual a todas as áreas de `/admin`.

### Key Entities

- **Administrador (usuário do painel)**: representa uma pessoa autorizada a acessar `/admin` (o usuário e/ou a filha). Atributos: e-mail (identificador de login), senha (armazenada como hash), nome de exibição. Cadastrado previamente por procedimento manual, não por auto-registro.
- **Sessão**: representa o estado de "autenticado" de um administrador após login bem-sucedido, com validade limitada no tempo; usada para decidir se uma requisição a `/admin` (página ou API) é permitida.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tentativas de acesso não autenticado a qualquer rota `/admin` (página ou API de mutação) resultam em bloqueio/redirecionamento — nenhuma tela ou dado administrativo é exibido sem login.
- **SC-002**: Um administrador cadastrado consegue logar e chegar à página do painel desejada em menos de 30 segundos, sem precisar de suporte técnico.
- **SC-003**: Após acionar logout, 100% das tentativas seguintes de acessar `/admin` (mesmo navegador) exigem novo login.
- **SC-004**: Zero incidentes de senha de administrador armazenada ou exposta em texto puro (verificável por revisão do armazenamento).

## Assumptions

- Apenas 1-2 administradores (o usuário e a filha) precisam de acesso; não há necessidade de autoatendimento de cadastro nem de níveis diferentes de permissão nesta tarefa.
- O cadastro de cada administrador (e-mail + senha) é feito por um procedimento manual/script executado por quem já tem acesso ao banco de dados — não existe fluxo de convite ou aprovação dentro do produto.
- Recuperação de senha esquecida é resolvida manualmente (fora do sistema, ex: redefinição direta no banco), não por fluxo de e-mail automatizado.
- A sessão tem um tempo de expiração razoável (padrão de mercado para painéis administrativos internos), após o qual o login é exigido novamente.
- As rotas públicas do site (catálogo, carrinho, checkout, páginas de produto) não são afetadas por esta tarefa — a exigência de autenticação vale somente para `/admin` e para as rotas de API que essas páginas administrativas consomem.
