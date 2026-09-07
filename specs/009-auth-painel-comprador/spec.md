# Feature Specification: Autenticação e painel do comprador (cliente)

**Feature Branch**: `edilsonaandrade/edi-84-tarefa-10-autenticacao-e-painel-do-comprador-cliente`
**Created**: 2026-09-06
**Status**: Draft
**Input**: User description: "Tarefa 10 (EDI-84): Autenticação e painel do comprador (cliente) — cadastro por e-mail/senha, login social via Google (NextAuth), recuperação de senha por código enviado por e-mail, envio de e-mails transacionais, associação de pedidos ao cliente autenticado, área 'Meus Pedidos' com histórico e status/rastreio, atualização de dados cadastrais e histórico de endereços, e notificação por e-mail ao admin quando uma venda é sincronizada de canal externo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastro e login do cliente (Priority: P1)

Uma pessoa que quer comprar (ou já comprou) na loja cria uma conta informando nome, e-mail e senha, ou opta por entrar com sua conta Google. Depois de criar a conta, ela consegue fazer login novamente usando as mesmas credenciais (e-mail/senha ou Google).

**Why this priority**: É o alicerce de tudo — sem conta e login não existe "cliente autenticado" para associar pedidos nem área "Meus Pedidos".

**Independent Test**: Pode ser testado isoladamente: criar uma conta nova por e-mail/senha e conseguir logar com ela; criar/entrar com uma conta Google e conseguir logar novamente.

**Acceptance Scenarios**:

1. **Given** uma pessoa sem conta, **When** ela se cadastra informando nome, e-mail e senha válidos, **Then** a conta é criada e ela é autenticada.
2. **Given** uma pessoa sem conta, **When** ela escolhe "Entrar com Google" e autoriza o acesso, **Then** uma conta é criada/associada automaticamente e ela é autenticada, sem precisar definir senha.
3. **Given** um e-mail já cadastrado por e-mail/senha, **When** alguém tenta se cadastrar novamente com o mesmo e-mail e senha, **Then** o sistema recusa e orienta a fazer login em vez de criar uma conta duplicada.
4. **Given** uma conta já existente, **When** o cliente informa e-mail e senha corretos, **Then** ele é autenticado e levado à área do comprador.
5. **Given** uma conta já existente criada por um método (ex: Google), **When** a mesma pessoa tenta entrar pelo e-mail correspondente usando o outro método (ex: cadastro por e-mail/senha), **Then** o sistema unifica automaticamente em uma única conta, passando a aceitar login por ambos os métodos para aquele e-mail.

---

### User Story 2 - Recuperação de senha (Priority: P2)

Um cliente que esqueceu a senha da sua conta de e-mail/senha informa seu e-mail na tela de "esqueci minha senha". O sistema envia um código por e-mail; o cliente informa esse código no site, e então define uma nova senha para voltar a acessar a conta.

**Why this priority**: Sem isso, um cliente que esquece a senha fica permanentemente sem acesso à própria conta e ao histórico de pedidos — mas o cadastro/login (US1) já entrega valor sozinho antes disso existir.

**Independent Test**: Pode ser testado isoladamente com uma conta de e-mail/senha já existente: solicitar recuperação, receber o código, informá-lo corretamente e definir uma nova senha que passa a funcionar no login.

**Acceptance Scenarios**:

1. **Given** um cliente com conta de e-mail/senha, **When** ele informa seu e-mail na recuperação de senha, **Then** o sistema envia um código por e-mail para esse endereço.
2. **Given** um código de recuperação recém-enviado, **When** o cliente o informa corretamente, **Then** o sistema permite que ele defina uma nova senha.
3. **Given** um código de recuperação, **When** o cliente informa um código incorreto ou expirado, **Then** o sistema recusa e explica que o código é inválido/expirou, permitindo solicitar um novo.
4. **Given** uma nova senha definida com sucesso, **When** o cliente faz login com ela, **Then** o acesso é concedido normalmente (a senha antiga deixa de funcionar).

---

### User Story 3 - "Meus Pedidos": histórico e acompanhamento (Priority: P1)

Um cliente autenticado acessa a área "Meus Pedidos" e vê a lista de todas as compras feitas por ele, com os itens, valor, status atual (pago, em produção, enviado, entregue) e o canal de origem de cada pedido (site, Mercado Livre, etc.). Quando houver informação de entrega disponível, ele também vê o código de rastreio e a transportadora.

**Why this priority**: É o principal valor visível entregue ao cliente pela autenticação — motivo prático para ele criar conta e logar.

**Independent Test**: Pode ser testado isoladamente com um cliente autenticado que tenha pelo menos um pedido associado à sua conta: acessar "Meus Pedidos" e conferir que os dados exibidos batem com o pedido real.

**Acceptance Scenarios**:

1. **Given** um cliente autenticado com pedidos associados à sua conta, **When** ele acessa "Meus Pedidos", **Then** vê a lista de seus pedidos (independente do canal em que foram feitos) com itens, valor e status de cada um.
2. **Given** um pedido com informação de rastreio disponível, **When** o cliente visualiza esse pedido em "Meus Pedidos", **Then** ele vê o código de rastreio e a transportadora.
3. **Given** um cliente autenticado sem nenhum pedido ainda, **When** ele acessa "Meus Pedidos", **Then** vê uma mensagem indicando que ainda não há pedidos, sem erro.
4. **Given** um pedido de outro cliente, **When** um cliente autenticado tenta visualizá-lo, **Then** o acesso é negado — cada cliente só vê os próprios pedidos.

---

### User Story 4 - Compra associada à conta, inclusive como convidado (Priority: P1)

Um cliente finaliza uma compra no site — autenticado ou como convidado, informando obrigatoriamente um e-mail de contato para acompanhar o pedido. Se autenticado, o pedido fica imediatamente associado à sua conta. Se comprou como convidado, o pedido fica vinculado ao e-mail informado; ao criar conta (ou logar) depois com esse mesmo e-mail, esse pedido — e qualquer outro já existente com o mesmo e-mail, incluindo os sincronizados de canais externos — passa a aparecer automaticamente em "Meus Pedidos".

**Why this priority**: É o que alimenta a User Story 3 — sem essa associação (seja no momento da compra, seja retroativamente ao criar conta), a área "Meus Pedidos" fica vazia ou incompleta.

**Independent Test**: Pode ser testado isoladamente de duas formas: (a) autenticado, completar uma compra no site e verificar que ela aparece imediatamente em "Meus Pedidos"; (b) comprar como convidado com um e-mail, depois criar conta com esse mesmo e-mail e verificar que o pedido de convidado aparece em "Meus Pedidos" assim que a conta é criada.

**Acceptance Scenarios**:

1. **Given** um cliente autenticado, **When** ele finaliza uma compra no checkout do site, **Then** o pedido gerado é associado à sua conta.
2. **Given** uma pessoa sem conta finalizando uma compra no checkout do site, **When** ela não está autenticada, **Then** o sistema continua permitindo a compra como convidado, exigindo apenas que ela informe um e-mail de contato válido para acompanhamento do pedido.
3. **Given** um pedido sincronizado de um canal externo (ex: Mercado Livre) cujo e-mail de contato bate com o de uma conta de cliente já cadastrada, **When** a sincronização ocorre, **Then** o pedido é associado a essa conta e passa a aparecer em "Meus Pedidos".
4. **Given** pedidos já existentes (feitos como convidado no site, ou sincronizados de canal externo) com um determinado e-mail, **When** uma conta é criada ou logada pela primeira vez com esse mesmo e-mail (por e-mail/senha ou Google), **Then** todos esses pedidos passam a aparecer em "Meus Pedidos" dessa conta, sem nenhuma ação extra do cliente.

---

### User Story 5 - Dados cadastrais e histórico de endereços (Priority: P3)

Um cliente autenticado acessa seus dados de cadastro e atualiza endereço e telefone. Ele também consegue ver os diferentes endereços já usados em compras anteriores.

**Why this priority**: Melhora a experiência e reduz erros em compras futuras, mas não bloqueia o valor central de autenticação + histórico de pedidos.

**Independent Test**: Pode ser testado isoladamente: autenticado, alterar o endereço/telefone cadastrado e confirmar que a mudança é salva; conferir que endereços usados em pedidos anteriores continuam listados no histórico.

**Acceptance Scenarios**:

1. **Given** um cliente autenticado, **When** ele atualiza endereço e/ou telefone no seu cadastro, **Then** os novos dados são salvos e refletidos ao visualizar o cadastro.
2. **Given** um cliente que já usou endereços diferentes em compras anteriores, **When** ele consulta o histórico de endereços, **Then** vê os endereços distintos já utilizados.

---

### User Story 6 - Notificação do admin em venda de canal externo (Priority: P3)

Quando uma venda feita em um canal externo (ex: Mercado Livre) é sincronizada com o sistema, o administrador recebe um e-mail avisando sobre a nova venda.

**Why this priority**: É uma conveniência operacional para o admin, reaproveitando a infraestrutura de e-mail criada nesta tarefa; não afeta a experiência do cliente comprador.

**Independent Test**: Pode ser testado isoladamente: forçar a sincronização de uma venda de canal externo e confirmar que o e-mail de notificação chega ao admin com os dados básicos da venda.

**Acceptance Scenarios**:

1. **Given** uma venda de canal externo recém-sincronizada, **When** a sincronização é concluída com sucesso, **Then** o sistema envia um e-mail ao admin informando a nova venda (canal, itens/valor).

### Edge Cases

- O que acontece se alguém tentar se cadastrar por e-mail/senha usando um e-mail que já existe via login Google (ou vice-versa)? → As contas são unificadas automaticamente: mesmo e-mail passa a ser a mesma conta de cliente, acessível por qualquer um dos métodos usados nela.
- O que acontece com pedidos feitos como convidado (sem login), inclusive antes desta funcionalidade existir? → Ao criar conta ou logar com o mesmo e-mail usado nesses pedidos (do site ou sincronizados de canal externo), eles passam a aparecer retroativamente em "Meus Pedidos" dessa conta.
- O que acontece se o cliente solicitar recuperação de senha várias vezes seguidas? → O sistema deve invalidar códigos anteriores ao gerar um novo e aplicar um limite razoável de tentativas/solicitações para evitar abuso.
- O que acontece se o e-mail de recuperação de senha for solicitado para um e-mail que não tem conta cadastrada? → O sistema deve responder de forma genérica (sem confirmar se o e-mail existe), para não vazar quais e-mails têm conta.
- O que acontece se o checkout for iniciado sem o cliente estar logado? → A compra continua permitida como convidado, desde que um e-mail de contato válido seja informado (já usado hoje para acompanhamento do pedido); esse e-mail é o que liga o pedido a uma futura conta criada com o mesmo endereço.
- O que acontece se o cliente informar no checkout de convidado um e-mail com grafia diferente da conta que ele criaria depois (ex: erro de digitação)? → Não há correspondência: a associação retroativa depende do e-mail ser exatamente igual (após normalização padrão, como minúsculas). Fora de escopo tentar adivinhar/corrigir e-mails digitados errado.
- O que acontece com pedidos e endereços já existentes de um cliente quando ele exclui/perde acesso à conta Google usada no login social? → Fora de escopo desta tarefa; não há exclusão de conta nesta versão.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que uma pessoa crie uma conta de cliente informando nome, e-mail e senha.
- **FR-002**: O sistema DEVE armazenar a senha do cliente de forma protegida (hash), nunca em texto puro.
- **FR-003**: O sistema DEVE permitir login por e-mail/senha para uma conta já cadastrada.
- **FR-004**: O sistema DEVE oferecer login/cadastro social via Google como alternativa ao e-mail/senha.
- **FR-005**: O sistema DEVE permitir que um cliente que esqueceu a senha solicite recuperação informando seu e-mail.
- **FR-006**: O sistema DEVE gerar e enviar por e-mail um código de recuperação de senha, com validade limitada no tempo.
- **FR-007**: O sistema DEVE validar o código informado pelo cliente e, se correto e ainda válido, permitir a definição de uma nova senha para a conta.
- **FR-008**: O sistema DEVE rejeitar códigos de recuperação incorretos ou expirados, sem alterar a senha da conta.
- **FR-009**: O sistema DEVE ter um provedor de envio de e-mails transacionais configurado, usado tanto para recuperação de senha quanto para notificação do admin.
- **FR-010**: O sistema DEVE associar automaticamente cada pedido finalizado no site por um cliente autenticado à conta desse cliente.
- **FR-011**: O sistema DEVE exibir, para um cliente autenticado, uma área "Meus Pedidos" listando somente os pedidos associados à própria conta.
- **FR-012**: Em cada pedido listado, o sistema DEVE exibir os itens comprados, o valor, o status atual e o canal de origem do pedido.
- **FR-013**: Quando houver informação de rastreio disponível para um pedido, o sistema DEVE exibi-la (código de rastreio e transportadora) na área "Meus Pedidos".
- **FR-014**: O sistema DEVE impedir que um cliente autenticado visualize pedidos associados à conta de outro cliente.
- **FR-015**: O sistema DEVE permitir que um cliente autenticado atualize seus dados de cadastro (endereço e telefone).
- **FR-016**: O sistema DEVE manter e exibir ao cliente autenticado o histórico de endereços distintos já utilizados em seus pedidos.
- **FR-017**: O sistema DEVE enviar um e-mail ao administrador sempre que uma venda de canal externo (ex: Mercado Livre) for sincronizada com sucesso.
- **FR-018**: O sistema DEVE associar a um cliente já cadastrado os pedidos sincronizados de canais externos cujo e-mail de contato corresponda ao e-mail dessa conta.
- **FR-019**: O sistema DEVE continuar permitindo finalizar compras no site sem login (como convidado), exigindo sempre um e-mail de contato válido para acompanhamento do pedido.
- **FR-020**: Ao criar conta ou logar pela primeira vez com um e-mail (por e-mail/senha ou Google), o sistema DEVE associar automaticamente a essa conta todos os pedidos pré-existentes com o mesmo e-mail — sejam do site (feitos como convidado) ou sincronizados de canal externo.
- **FR-021**: Quando um e-mail de cadastro/login corresponder a uma conta já existente criada pelo outro método de autenticação (e-mail/senha vs Google), o sistema DEVE unificar automaticamente as duas formas de acesso em uma única conta de cliente, em vez de recusar ou criar uma conta duplicada.

### Key Entities

- **Cliente (comprador)**: representa uma pessoa que compra na loja. Atributos: nome, e-mail (identificador de login), senha (hash, quando aplicável), método(s) de login associados (e-mail/senha e/ou Google), telefone, endereço atual. Distinto do "Administrador" do painel (Tarefa 9/EDI-86).
- **Pedido**: já existe no sistema (Tarefas 3–8); nesta tarefa passa a poder ser associado a um Cliente, além de manter itens, valor, status, canal de origem e dados de rastreio quando disponíveis.
- **Endereço**: representa um endereço de entrega usado em um pedido; o histórico de endereços de um cliente é composto pelos endereços distintos já usados em seus pedidos, mais o endereço atual do cadastro.
- **Código de recuperação de senha**: código temporário gerado para validar a identidade do cliente antes de permitir a troca de senha; tem validade limitada e é invalidado após uso ou ao gerar um novo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa nova consegue criar conta e fazer o primeiro login (por e-mail/senha ou Google) em menos de 2 minutos.
- **SC-002**: Um cliente que esqueceu a senha consegue recuperá-la e voltar a acessar a conta em menos de 5 minutos, sem suporte manual.
- **SC-003**: 100% dos pedidos finalizados no site por um cliente autenticado aparecem em "Meus Pedidos" dessa conta imediatamente após a compra.
- **SC-004**: 100% das tentativas de um cliente visualizar pedidos de outra conta são bloqueadas.
- **SC-005**: 100% das vendas sincronizadas de canais externos geram um e-mail de notificação ao admin.
- **SC-006**: Zero incidentes de senha de cliente armazenada ou exposta em texto puro (verificável por revisão do armazenamento).
- **SC-007**: 100% dos pedidos pré-existentes (convidado ou canal externo) com e-mail correspondente aparecem em "Meus Pedidos" imediatamente após a criação/primeiro login da conta com esse e-mail.

## Assumptions

- **[Atualizado após implementação]** O cadastro por e-mail/senha exige confirmar a posse do e-mail: um código de 6 dígitos (válido por 10 minutos) é enviado ao criar a conta, e o login só é liberado depois de confirmado (`/verificar-email`). Contas via Google já nascem/ficam verificadas automaticamente (o Google já provou a posse do e-mail), inclusive quando unificadas com uma conta de e-mail/senha ainda não verificada.
- O código de recuperação de senha é numérico, enviado por e-mail, com validade curta (padrão de mercado, ex.: 15–30 minutos) e uso único.
- O provedor de e-mail transacional (Resend, SendGrid ou similar) é escolhido na fase de planejamento técnico; esta especificação não depende de qual provedor específico é usado.
- Exclusão de conta, múltiplos endereços salvos simultaneamente para escolha no checkout, e alteração de e-mail de login ficam fora do escopo desta tarefa.
- Reset ou alteração de senha exige sempre o fluxo de código por e-mail (não há tela de "trocar senha" informando a senha atual dentro do cadastro nesta versão).
- O checkout do site já exige (ou passa a exigir) um e-mail de contato válido mesmo para compra como convidado; esse e-mail é a chave usada para a associação retroativa de pedidos ao criar/logar em uma conta.
- A associação retroativa de pedidos por e-mail depende de correspondência exata (após normalização padrão, como minúsculas) — não há correção automática de e-mails digitados incorretamente em compras de convidado.
- A unificação automática de contas por e-mail (Google e e-mail/senha) assume que quem tem acesso à caixa de e-mail é o dono legítimo da conta — mesmo padrão de confiança já usado por provedores de login social em geral.
- E-mail de confirmação de pedido (com número do pedido) para quem compra no site, autenticado ou como convidado, está fora do escopo desta tarefa. O e-mail transacional configurado aqui (FR-009) atende apenas recuperação de senha e notificação ao admin. Candidato a ticket irmão da EDI-84 (mesmo parent EDI-73), reaproveitando o mesmo provedor.
