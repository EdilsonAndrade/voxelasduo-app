# Feature Specification: Setup do Projeto e Infraestrutura Base

**Feature Branch**: `edilsonaandrade/edi-74-tarefa-1-setup-do-projeto-e-infraestrutura-base`
**Created**: 2026-09-03
**Status**: Draft
**Input**: Linear EDI-74 (Tarefa 1, filha do Épico EDI-73 — E-commerce de Produtos 3D): "Criar projeto Next.js (App Router) e configurar deploy contínuo na Vercel; configurar cluster MongoDB Atlas (tier gratuito) e variáveis de ambiente de conexão; definir modelagem inicial de dados (coleção de produtos e coleção de pedidos); configurar estrutura de pastas para API Routes (ex: /api/produtos, /api/pedidos, /api/webhooks)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aplicação publicada automaticamente a cada alteração (Priority: P1)

Como desenvolvedor do projeto, preciso que o site fique publicado e acessível publicamente assim que qualquer alteração for enviada ao repositório, para que cada funcionalidade nova (catálogo, carrinho, pagamento, etc.) tenha onde rodar e possa ser demonstrada e testada em produção sem passos manuais.

**Why this priority**: Sem um ambiente publicado e atualizado automaticamente, nenhuma das tarefas seguintes do épico pode ser demonstrada ou validada em condições reais. É a base sobre a qual tudo mais é construído.

**Independent Test**: Pode ser testado publicando uma página inicial simples no repositório e confirmando que ela fica acessível publicamente pela URL de produção logo após o envio da alteração.

**Acceptance Scenarios**:

1. **Given** o projeto está configurado e conectado à Vercel, **When** uma alteração é enviada ao branch principal, **Then** uma nova versão do site é publicada automaticamente e fica acessível publicamente sem intervenção manual.
2. **Given** uma alteração enviada contém um erro que impede o build, **When** o deploy é acionado, **Then** a versão anterior publicada continua no ar e o erro fica visível para o desenvolvedor.

---

### User Story 2 - Fonte única de dados para produtos e pedidos (Priority: P2)

Como desenvolvedor do projeto, preciso de um banco de dados único e confiável para armazenar produtos e pedidos, para que o catálogo e as vendas tenham sempre a mesma fonte de verdade — hoje pelo site, e no futuro também pelas integrações com Shopee e Mercado Livre.

**Why this priority**: Todas as tarefas seguintes (catálogo, checkout, pagamento, sincronização de estoque, integrações com marketplaces, painel administrativo) dependem de um modelo de dados definido e de uma conexão de banco funcionando. Sem isso, nada pode persistir informação real.

**Independent Test**: Pode ser testado conectando a aplicação ao banco de dados e gravando/lendo um registro de teste em cada uma das duas coleções (produtos e pedidos).

**Acceptance Scenarios**:

1. **Given** as variáveis de ambiente de conexão estão configuradas, **When** a aplicação inicia, **Then** ela se conecta com sucesso ao cluster MongoDB Atlas.
2. **Given** a conexão com o banco está ativa, **When** um produto de teste é criado com nome, descrição, preço, fotos, estoque e categoria, **Then** o registro é salvo e pode ser recuperado com todos os campos preservados.
3. **Given** a conexão com o banco está ativa, **When** um pedido de teste é criado com itens, cliente, status, canal de origem, valor e dados de pagamento, **Then** o registro é salvo e pode ser recuperado com todos os campos preservados.

---

### User Story 3 - Estrutura previsível para as rotas de API (Priority: P3)

Como desenvolvedor do projeto, preciso de uma estrutura de pastas organizada para as rotas de API, para que cada funcionalidade futura (produtos, pedidos, webhooks de pagamento e de marketplaces) tenha um local claro e previsível para ser implementada, sem retrabalho de reorganização mais adiante.

**Why this priority**: Não bloqueia a publicação nem a persistência de dados, mas evita desorganização e retrabalho conforme as próximas 8 tarefas do épico forem implementadas.

**Independent Test**: Pode ser testado criando uma rota de exemplo em cada agrupamento (`/api/produtos`, `/api/pedidos`, `/api/webhooks`) e confirmando que cada uma responde corretamente a uma chamada simples.

**Acceptance Scenarios**:

1. **Given** a estrutura de pastas de API está criada, **When** um novo desenvolvedor (ou o próprio autor, no futuro) precisa implementar uma funcionalidade de produtos, pedidos ou webhooks, **Then** ele encontra o local correto apenas observando a estrutura de pastas, sem precisar perguntar.

---

### Edge Cases

- O que acontece se a string de conexão do MongoDB Atlas estiver ausente ou incorreta na inicialização? O erro deve ser claro nos logs, não falhar silenciosamente nem deixar a aplicação travada sem explicação.
- O que acontece se o deploy de uma alteração falhar por erro de build na Vercel? A versão anterior publicada deve permanecer no ar; o site não pode ficar fora do ar por causa de um deploy quebrado.
- O que acontece quando as coleções de produtos e pedidos ainda não têm nenhum documento? A aplicação deve inicializar e operar normalmente (catálogo vazio, sem pedidos), sem erros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST ser um projeto Next.js utilizando App Router.
- **FR-002**: O sistema MUST estar configurado com deploy contínuo na Vercel, de modo que toda alteração enviada ao branch principal gere automaticamente uma nova versão publicada publicamente.
- **FR-003**: O sistema MUST se conectar a um cluster MongoDB Atlas (tier gratuito) usando variáveis de ambiente para as credenciais de conexão, sem nenhuma credencial de acesso versionada no código-fonte.
- **FR-004**: O sistema MUST definir uma coleção de "produtos" contendo, no mínimo: nome, descrição, preço, fotos, estoque e categoria.
- **FR-005**: O sistema MUST definir uma coleção de "pedidos" contendo, no mínimo: itens comprados, dados do cliente, status do pedido, canal de origem da venda, valor total e dados de pagamento.
- **FR-006**: O sistema MUST expor uma estrutura de rotas de API organizada por domínio, incluindo ao menos os agrupamentos de produtos, pedidos e webhooks (ex.: `/api/produtos`, `/api/pedidos`, `/api/webhooks`).
- **FR-007**: As variáveis de ambiente sensíveis (ex.: string de conexão do MongoDB) MUST poder ser configuradas separadamente para ambiente local e para produção (Vercel), sem serem versionadas no repositório.
- **FR-008**: O sistema MUST oferecer uma forma de verificar que a aplicação está corretamente conectada ao banco de dados (ex.: rota de verificação de saúde/health-check).

### Key Entities *(include if feature involves data)*

- **Produto**: item do catálogo à venda. Atributos: nome, descrição, preço, fotos (uma ou mais imagens), quantidade em estoque, categoria.
- **Pedido**: registro de uma venda realizada. Atributos: itens comprados (produto + quantidade), dados do cliente, status (ex.: pendente, pago, enviado), canal de origem (site, Shopee, Mercado Livre), valor total, dados de pagamento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma alteração enviada ao repositório fica publicamente acessível na URL de produção em até 5 minutos, sem qualquer intervenção manual.
- **SC-002**: É possível gravar e recuperar corretamente um registro de teste em cada uma das duas coleções (produtos e pedidos), com todos os campos obrigatórios preservados.
- **SC-003**: Um desenvolvedor consegue identificar, apenas observando a estrutura de pastas, onde implementar uma nova funcionalidade de produtos, pedidos ou webhooks — sem precisar perguntar ou consultar documentação externa.
- **SC-004**: Nenhuma credencial de acesso ao banco de dados fica exposta no código-fonte versionado no repositório.

## Assumptions

- O deploy contínuo usa a integração nativa da Vercel com o repositório Git (push no branch principal aciona um novo deploy).
- O cluster MongoDB Atlas de tier gratuito (M0) é suficiente para esta fase inicial do projeto; upgrade de tier fica fora do escopo desta tarefa.
- As coleções de produtos e pedidos poderão ganhar campos adicionais nas tarefas seguintes do épico (ex.: campos de sincronização com Shopee/Mercado Livre, referência de pagamento do Mercado Pago), sem necessidade de migração complexa nesta etapa.
- Autenticação de usuários finais e área administrativa não fazem parte desta tarefa — ficam a cargo das tarefas de catálogo (EDI-75) e painel administrativo (EDI-81).
- A estrutura de API Routes criada aqui servirá de base tanto para as rotas internas do site quanto para os webhooks de pagamento e de marketplaces das tarefas futuras (EDI-77, EDI-79, EDI-80).
