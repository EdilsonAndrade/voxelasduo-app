# Research: Carrinho e Checkout (EDI-76)

Resultados da Fase 0 — decisões técnicas com alternativas consideradas.

## 1. Estado do carrinho no cliente

**Decision**: React Context + `useReducer` + persistência em `localStorage`, sem dependência nova.

**Rationale**: O ticket sugere "contexto React ou biblioteca leve de state management". O projeto (Tarefas 1-2) não possui nenhuma biblioteca de estado e é minimalista em dependências (Next, React, mongodb, @vercel/blob). Contexto React cobre totalmente a necessidade (um estado global pequeno: lista de itens + ações adicionar/alterar/remover/limpar) sem custo de bundle extra. `localStorage` atende a persistência entre sessões no mesmo dispositivo (FR-002, SC-004) sem servidor.

**Alternatives considered**: Zustand (dependência nova, API menor, mas desnecessária para um estado tão simples); cookies (limite de tamanho e serialização manual); persistência server-side (exigiria identificação de visitante — sem auth até EDI-81 — e contraria "estado no cliente" do ticket).

## 2. Idempotência do checkout (anti-duplicação de pedido)

**Decision**: Token de idempotência gerado no cliente ao abrir o checkout (UUID), enviado no POST; índice único esparso no campo `idempotencia` da coleção `pedidos`; em duplicata, o servidor retorna o pedido já existente em vez de criar outro.

**Rationale**: FR-013 (nenhum checkout gera dois pedidos para a mesma compra) precisa valer mesmo com duplo clique/reações de rede. O padrão idempotency key é o mecanismo padrão de APIs de pagamento/e-commerce e é barato no MongoDB (índice único esparso só indexa documentos com o campo). Complementa (não substitui) o bloqueio do botão no cliente.

**Alternatives considered**: Apenas desabilitar o botão no cliente (falha com reenvio automático/duas abas); transação com verificação de carrinho (complexa, sem garantia de unicidade do "evento" de checkout).

## 3. Validação de estoque e preços no servidor

**Decision**: O POST de pedidos lê os produtos do banco, valida quantidade × estoque por produto e recalcula `precoUnitario` e `valorTotal` exclusivamente com os preços do banco. Nenhum preço ou total vindo do cliente é confiado (o cliente envia apenas `produtoId` e `quantidade`).

**Rationale**: Atende FR-009/FR-010 e SC-003 (total sempre = soma dos preços vigentes). A página de detalhe (Tarefa 2) já bloqueia adicionar acima do estoque (FR-005), mas o estoque pode mudar entre a adição e o checkout — a validação no servidor é a fonte de verdade no momento crítico.

**Alternatives considered**: Confiar no carrinho do cliente (vulnerável a manipulação); validar via endpoint separado pré-checkout + revalidar na criação (dupla chamada, janela de corrida desnecessária para a escala do projeto). Para escala de dezenas de pedidos/dia, corridas de estoque não são preocupação real — e o abatimento (EDI-78) tratará a fonte de verdade na confirmação de pagamento.

## 4. Status do pedido e ciclo de vida

**Decision**: Pedido criado com `status: "pendente"` e `canalOrigem: "site"` nesta tarefa. Página `/pedido/[id]` exibe resumo e indica "aguardando pagamento". Transições para "pago"/"cancelado" são escopo de EDI-77; "enviado" é EDI-81.

**Rationale**: Decisão do usuário registrada no spec — o pedido existe no banco antes do pagamento, e a Tarefa 4 apenas avança o status via webhook do Mercado Pago. O modelo `Pedido` da Tarefa 1 já prevê `status: "pendente"` e o tipo `PagamentoPedido` extensível.

**Alternatives considered**: Criar pedido apenas no pagamento (EDI-77) — rejeitado pelo usuário; criaria acoplamento do checkout ao gateway e impediria a página de confirmação nesta tarefa.

## 5. Leitura do pedido na página de confirmação

**Decision**: A página `/pedido/[id]` (Server Component) consulta o pedido diretamente via `lib/pedidos/repository.ts`, sem rota de API dedicada; `notFound()` quando inexistente. O GET `/api/pedidos` (esqueleto da Tarefa 1) é mantido como está — a listagem administrativa completa é escopo de EDI-81.

**Rationale**: Mesmo padrão já usado nas páginas de produtos da Tarefa 2 (Server Components consultando o repositório direto). Evita rota de leitura por ID sem consumidor real nesta tarefa.

**Alternatives considered**: `GET /api/pedidos/[id]` (adiaria para EDI-81, quando o painel administrativo consumirá leitura por id); ler via client fetch (desnecessário — Server Component é mais simples e não expõe a regra no cliente).

## 6. Formulário de checkout e validação

**Decision**: Formulário como Client Component com validação por campo no padrão do projeto (função pura retornando mapa `campo → erro`, testável no Vitest), espelhando `lib/produtos/validation.ts`. Bloqueio de duplo envio com estado `enviando` + token de idempotência.

**Rationale**: O projeto não usa biblioteca de formulários (react-hook-form etc.) e a Tarefa 2 estabeleceu o padrão de validação pura testável. Para um formulário de 10 campos, o padrão existente é suficiente e consistente.

**Alternatives considered**: react-hook-form + zod (dependências novas, mais robustas em formulários grandes — desnecessário aqui); validação apenas no servidor (UX pior, viola FR-007 que pede indicação por campo antes do envio).

## 7. I18N / textos

**Decision**: Seguir o padrão atualmente existente no projeto: textos em PT-BR inline nas páginas/componentes (como feito em todas as telas da Tarefa 2). Não há infraestrutura de I18N implementada ainda (nenhuma biblioteca nem dicionários encontrados no código).

**Rationale**: AGENTS.md exige seguir "o padrão já existente I18N", mas o único padrão existente no código é texto PT-BR direto. Introduzir uma biblioteca de I18N nesta tarefa seria escopo novo não solicitado.

**Alternatives considered**: Introduzir next-intl ou estrutura de dicionários própria (escopo não pedido; melhor ser decisão própria — sugiro discutir antes da Tarefa 4 ou quando o projeto for aberto a outro idioma).

## 8. Sem cálculo de frete

**Decision**: Nenhum cálculo de frete/custo de envio; o endereço é coletado e armazenado, mas o total do pedido = soma dos itens.

**Rationale**: O ticket não menciona frete; a política de frete depende de decisões de negócio (correios, retirada, etc.) que não foram tomadas. Registrar endereço já deixa o pedido pronto para a evolução.

**Alternatives considered**: Frete fixo (precisaria de definição de valor pelo dono do produto); integração de cálculo (fora de proporção para esta fase).
