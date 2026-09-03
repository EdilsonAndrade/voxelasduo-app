# Feature Specification: Carrinho e Checkout

**Feature Branch**: `edilsonaandrade/edi-76-tarefa-3-carrinho-e-checkout`
**Created**: 2026-09-03
**Status**: Draft
**Input**: Linear EDI-76 (épico EDI-73, projeto Voxelas Duo) — "Tarefa 3: Carrinho e checkout": implementar carrinho de compras (estado no cliente, ex: contexto React ou biblioteca leve de state management); implementar fluxo de checkout (dados do cliente, endereço de entrega, resumo do pedido); validar disponibilidade de estoque no momento do checkout.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitante monta e gerencia o carrinho (Priority: P1)

Como visitante do site, quero adicionar produtos ao carrinho a partir da página de detalhe, ver os itens escolhidos e ajustar quantidades ou remover itens, para preparar minha compra antes de finalizar.

**Why this priority**: O carrinho é o ponto de partida de toda a jornada de compra — sem ele não existe checkout. É a fundação sobre a qual as demais histórias se apoiam.

**Independent Test**: Pode ser testado isoladamente navegando até um produto com estoque, adicionando-o ao carrinho (com quantidade), abrindo `/carrinho` e conferindo nome, foto, preço, quantidade, subtotal e total; alterando a quantidade e removendo um item; fechando e reabrindo o navegador e confirmando que o carrinho continua lá.

**Acceptance Scenarios**:

1. **Given** um produto com estoque disponível, **When** o visitante adiciona o produto ao carrinho com determinada quantidade, **Then** o carrinho passa a exibir o item com nome, foto, preço unitário, quantidade escolhida, subtotal e o total geral atualizado.
2. **Given** o visitante está na página do carrinho, **When** altera a quantidade de um item ou o remove, **Then** subtotais e total são recalculados imediatamente e refletem a nova composição.
3. **Given** o visitante fechou o navegador com itens no carrinho, **When** retorna ao site no mesmo dispositivo sem limpar os dados do navegador, **Then** os itens ainda estão no carrinho.
4. **Given** o carrinho está vazio, **When** o visitante acessa `/carrinho`, **Then** vê uma mensagem clara de carrinho vazio com caminho de volta para os produtos, em vez de uma tela vazia.
5. **Given** existem itens no carrinho, **When** o visitante olha o cabeçalho do site, **Then** o ícone do carrinho exibe a contagem atual de itens.

---

### User Story 2 - Visitante finaliza o checkout e cria o pedido (Priority: P1)

Como visitante com itens no carrinho, quero informar meus dados de contato e endereço de entrega, revisar o resumo do pedido e confirmar, para que o pedido seja registrado e eu receba uma confirmação.

**Why this priority**: É o objetivo final da tarefa — transformar o carrinho em um pedido registrado, com os dados necessários para a etapa de pagamento (Tarefa 4) e para o envio.

**Independent Test**: Pode ser testado isoladamente com itens no carrinho, preenchendo o formulário de checkout (nome, email, endereço completo) com dados válidos, conferindo o resumo exibido, confirmando, e verificando que o pedido foi criado com status "pendente" e que a página de confirmação mostra o resumo.

**Acceptance Scenarios**:

1. **Given** o visitante está em `/checkout` com itens no carrinho, **When** preenche nome, email e endereço de entrega válidos e confirma, **Then** o pedido é criado com status "pendente", canal de origem "site", itens, cliente e endereço informados, e o visitante é levado à página de confirmação do pedido com o resumo completo.
2. **Given** o visitante tenta confirmar o checkout com campos obrigatórios ausentes ou inválidos (ex: email sem formato válido), **When** envia o formulário, **Then** o sistema impede o envio e indica quais campos precisam ser corrigidos.
3. **Given** o pedido foi criado com sucesso, **When** o visitante vê a página de confirmação, **Then** o carrinho foi esvaziado e o pedido exibe a indicação de que está pendente de pagamento.
4. **Given** o visitante confirma o checkout duas vezes rapidamente (ex: duplo clique), **When** o sistema processa os envios, **Then** apenas um pedido é criado para aquela compra.

---

### User Story 3 - Estoque é validado no momento do checkout (Priority: P2)

Como visitante prestes a finalizar a compra, quero que o sistema verifique o estoque real de cada item naquele momento, para que eu não consiga confirmar um pedido com produtos esgotados ou em quantidade maior do que a disponível.

**Why this priority**: Protege a operação contra vendas impossíveis de cumprir. Foi priorizado como P2 porque a validação reforça o fluxo principal (P1), mas o valor central da tarefa — carrinho e pedido — já é entregue pelas histórias anteriores.

**Independent Test**: Pode ser testado isoladamente reduzindo o estoque de um produto no banco (ou no painel administrativo) após adicioná-lo ao carrinho, tentando finalizar o checkout e confirmando que o sistema bloqueia a confirmação com mensagem clara sobre o item e a quantidade disponível.

**Acceptance Scenarios**:

1. **Given** um item do carrinho tem quantidade maior do que o estoque atual do produto, **When** o visitante tenta confirmar o checkout, **Then** o sistema bloqueia a confirmação e informa o item e a quantidade disponível.
2. **Given** um produto do carrinho ficou com estoque zerado (ou foi removido do catálogo) após ser adicionado, **When** o visitante tenta confirmar o checkout, **Then** o sistema bloqueia a confirmação e explica que o produto não está mais disponível.
3. **Given** todos os itens têm estoque suficiente, **When** o visitante confirma o checkout, **Then** o pedido é criado com os preços vigentes no momento da compra, independentemente de qualquer valor exibido ou armazenado no navegador.

### Edge Cases

- O que acontece se o visitante acessa `/checkout` com o carrinho vazio? O sistema impede o fluxo e direciona de volta ao carrinho ou aos produtos, sem permitir criar pedido vazio.
- O que acontece se os dados do carrinho armazenados no navegador estiverem corrompidos ou inválidos? O sistema trata como carrinho vazio, sem quebrar a página.
- O que acontece se o preço de um produto mudar entre a adição ao carrinho e o checkout? O preço exibido no carrinho pode estar desatualizado, mas o pedido é sempre criado com os preços vigentes no banco no momento da confirmação (o servidor recalcula o total).
- O que acontece se dois itens do carrinho somados excederem o estoque do mesmo produto (ex: itens duplicados)? A validação considera a quantidade total por produto, não cada item isoladamente.
- O que acontece se o mesmo carrinho for usado em duas abas ao mesmo tempo? Não há sincronização em tempo real entre abas nesta tarefa — a última alteração gravada prevalece.
- O que acontece se a criação do pedido falhar no servidor (ex: falha de conexão)? O visitante recebe uma mensagem de erro compreensível e o carrinho é preservado para nova tentativa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que o visitante adicione um produto ao carrinho a partir da página de detalhe do produto, informando a quantidade desejada.
- **FR-002**: O carrinho DEVE ser mantido como estado no cliente (persistido no navegador do visitante, sem depender de login) e DEVE exibir, para cada item, nome, foto, preço unitário, quantidade e subtotal, além do total geral do carrinho.
- **FR-003**: O sistema DEVE permitir que o visitante altere a quantidade e remova itens do carrinho.
- **FR-004**: O cabeçalho do site DEVE exibir um ícone de carrinho com contador de itens, conforme a arquitetura do site.
- **FR-005**: O sistema DEVE impedir a adição ao carrinho de quantidade maior do que o estoque disponível do produto, informando o limite.
- **FR-006**: O checkout DEVE coletar do visitante: nome, email, telefone (opcional) e endereço de entrega completo (logradouro, número, complemento opcional, bairro, cidade, estado e CEP).
- **FR-007**: O sistema DEVE validar os dados do formulário de checkout antes do envio (campos obrigatórios preenchidos, email em formato válido) e indicar claramente o que precisa ser corrigido.
- **FR-008**: O checkout DEVE exibir um resumo do pedido (itens, quantidades, preços e total) para revisão antes da confirmação.
- **FR-009**: No momento da confirmação do checkout, o sistema DEVE validar no banco de dados a disponibilidade de estoque de cada item, bloqueando a criação do pedido com mensagem clara quando algum item estiver indisponível ou exceder o estoque.
- **FR-010**: Ao confirmar um checkout válido, o sistema DEVE criar um pedido com status "pendente", canal de origem "site", itens com preço unitário capturado do banco no momento da compra, dados do cliente e endereço, e valor total calculado no servidor (ignorando qualquer valor vindo do navegador).
- **FR-011**: Após a criação do pedido, o sistema DEVE exibir uma página de confirmação com o resumo do pedido e a indicação de que o pedido está pendente de pagamento.
- **FR-012**: O sistema DEVE esvaziar o carrinho após a criação bem-sucedida do pedido.
- **FR-013**: O sistema DEVE impedir a criação de pedidos duplicados a partir de um mesmo envio de checkout (ex: duplo clique no botão de confirmação).
- **FR-014**: O sistema DEVE impedir o acesso ao checkout sem itens no carrinho, redirecionando o visitante ao carrinho ou aos produtos.
- **FR-015**: O sistema NÃO DEVE abater o estoque dos produtos nesta tarefa — o abatimento ocorre na Tarefa 5 (EDI-78), após a confirmação de pagamento.
- **FR-016**: Todo texto exibido ao usuário (rótulos, mensagens de erro, página de confirmação, etc.) DEVE seguir o padrão de internacionalização (I18N) já existente no projeto.

### Key Entities *(include if feature involves data)*

- **Carrinho**: estado mantido no cliente com a lista de itens escolhidos (produto e quantidade). Persistido no navegador do visitante; esvaziado após a criação do pedido.
- **Pedido** (modelo já definido na Tarefa 1): registro da compra com itens (produto, quantidade, preço unitário capturado na compra), cliente (nome, email, telefone, endereço), status ("pendente" nesta tarefa), canal de origem ("site"), valor total e datas de criação/atualização.
- **Item de Pedido**: vínculo entre pedido e produto com quantidade e preço unitário no momento da compra — preço nunca herdado de valores armazenados no navegador do cliente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um visitante com um produto já visto consegue adicioná-lo ao carrinho e concluir o checkout completo (dados + endereço + confirmação) em até 3 minutos na primeira tentativa.
- **SC-002**: 100% das tentativas de confirmação de checkout com estoque insuficiente ou produto indisponível são bloqueadas com mensagem clara, sem criar pedido.
- **SC-003**: 100% dos pedidos criados têm valor total igual à soma dos itens com os preços vigentes no banco no momento da compra, independentemente de manipulação de valores no navegador.
- **SC-004**: O carrinho permanece disponível após fechar e reabrir o navegador no mesmo dispositivo em 100% dos casos em que os dados do navegador não foram apagados.
- **SC-005**: Nenhum checkout confirmado gera mais de um pedido para a mesma compra, mesmo com envios duplicados.
- **SC-006**: 100% dos pedidos criados apresentam todos os campos obrigatórios de cliente e endereço preenchidos e válidos.

## Assumptions

- As rotas seguem a hierarquia já definida em `specs/site-architecture.md`: `/carrinho` (página do carrinho), `/checkout` (formulário + resumo) e `/pedido/[id]` (página de confirmação do pedido).
- **Decisão do usuário**: esta tarefa cria o pedido no MongoDB com status "pendente" ao finalizar o checkout (via nova rota de API de pedidos); a Tarefa 4 (EDI-77) apenas avança o status após a confirmação de pagamento e pluga o fluxo de pagamento.
- O pagamento (Mercado Pago) está fora do escopo desta tarefa (EDI-77). A página de confirmação indica que o pedido está pendente de pagamento; nenhuma cobrança é realizada ainda.
- O abatimento de estoque está fora do escopo desta tarefa (EDI-78). Aqui o estoque é apenas validado, nunca alterado.
- Não há autenticação/login no site ainda (escopo EDI-81): o checkout é 100% como visitante (guest checkout).
- Não há cálculo de frete/custo de envio nesta tarefa — o ticket não o menciona e a definição de política de frete pode evoluir em tarefa futura; o endereço é coletado e armazenado no pedido.
- Não há cupons, descontos ou taxas adicionais no total do pedido nesta tarefa.
- O carrinho é por dispositivo (persistido no navegador), sem sincronização entre dispositivos ou contas.
- Catálogo de porte pequeno (dezenas de produtos): não há exigência de performance ou escala além do uso doméstico do site.
- O projeto é multi-idioma (I18N); todo texto voltado ao usuário deve seguir o padrão de internacionalização já existente.
