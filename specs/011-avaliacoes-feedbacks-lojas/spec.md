# Feature Specification: Importação de Avaliações e Feedbacks das Lojas Parceiras

**Feature Branch**: `edilsonaandrade/edi-85-tarefa-11-importacao-de-avaliacoes-e-feedbacks-das-lojas`
**Created**: 2026-09-07
**Status**: Draft
**Input**: Linear EDI-85 (épico EDI-73, projeto Voxelas Duo) — "Tarefa 11: Importação de avaliações e feedbacks das lojas parceiras": integrar com os endpoints de avaliações/comentários da API da Shopee e da API do Mercado Livre para buscar feedbacks deixados pelos clientes nos produtos; buscar periodicamente (job agendado) as avaliações de cada produto vendido nos canais externos; armazenar as avaliações no MongoDB, associadas ao produto correspondente; exibir no site uma seção de "avaliações de clientes" reunindo os feedbacks vindos do site, da Shopee e do Mercado Livre.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitante vê avaliações de clientes na página do produto (Priority: P1) 🎯 MVP

Como visitante do site, quero ver, na página de um produto, as avaliações e comentários deixados por outros compradores — tanto os que compraram pelo site quanto os que compraram pela Shopee ou pelo Mercado Livre — para decidir com mais confiança se compro esse produto.

**Why this priority**: É o valor final visível ao cliente e a razão de existir da tarefa — sem essa seção exibida, a importação de avaliações não gera nenhum benefício percebido.

**Independent Test**: Abrir a página de um produto de teste que já tenha avaliações importadas de pelo menos dois canais (ex: site e Mercado Livre) e verificar que a seção "avaliações de clientes" lista os feedbacks dos dois canais, com nota, comentário e indicação de origem.

**Acceptance Scenarios**:

1. **Given** um produto com avaliações vindas do site, da Shopee e do Mercado Livre, **When** o visitante abre a página desse produto, **Then** a seção "avaliações de clientes" exibe todos os feedbacks reunidos, cada um com nota, comentário (quando houver) e o canal de origem.
2. **Given** um produto sem nenhuma avaliação em qualquer canal, **When** o visitante abre a página desse produto, **Then** a seção é exibida com uma mensagem indicando que ainda não há avaliações, sem erro.
3. **Given** um produto com avaliações apenas em canais externos (nenhuma feita diretamente no site), **When** o visitante abre a página desse produto, **Then** todas as avaliações externas aparecem normalmente na seção.

---

### User Story 2 - Sistema importa periodicamente as avaliações dos canais externos (Priority: P1)

Como responsável pela loja, quero que o sistema busque automaticamente, em intervalos regulares, as avaliações feitas na Shopee e no Mercado Livre para os produtos vendidos nesses canais, para não precisar copiar feedbacks manualmente para o site.

**Why this priority**: É o mecanismo que alimenta a User Story 1 — sem a busca periódica, a seção de avaliações nunca teria conteúdo novo dos canais externos.

**Independent Test**: Disparar manualmente uma execução do job de importação para um produto de teste com avaliações conhecidas na Shopee ou no Mercado Livre e verificar que essas avaliações passam a existir no MongoDB, associadas ao produto correto.

**Acceptance Scenarios**:

1. **Given** um produto com anúncio ativo no Mercado Livre e/ou na Shopee, **When** o job agendado de importação de avaliações executa, **Then** as avaliações novas desse anúncio, em cada canal, são buscadas e armazenadas no MongoDB associadas ao produto correspondente.
2. **Given** uma avaliação de um canal externo já importada anteriormente, **When** o job executa novamente e essa avaliação continua existindo no canal sem alteração, **Then** ela não é duplicada no MongoDB.
3. **Given** um produto sem anúncio associado em nenhum canal externo (`integracoes.mercadoLivreId` e `integracoes.shopeeItemId` ausentes), **When** o job executa, **Then** esse produto é ignorado na busca de avaliações externas, sem gerar erro.
4. **Given** uma avaliação já importada que foi editada pelo cliente no canal externo (ex: nota ou comentário alterado), **When** o job processa novamente esse mesmo item, **Then** o registro armazenado é atualizado para refletir o conteúdo mais recente, sem criar um segundo registro.

---

### User Story 3 - Falha de importação em um canal não compromete os demais (Priority: P2)

Como responsável pela loja, quero que uma falha ao buscar avaliações em um canal externo (ex: credencial expirada, indisponibilidade da API) não impeça a importação dos demais produtos e canais, para que o site continue recebendo avaliações válidas mesmo quando um canal específico está com problema.

**Why this priority**: Garante a confiabilidade do job de importação (User Story 2) em produção, mas o valor central da tarefa (US1 e US2) já é demonstrável sem este tratamento fino de falhas.

**Independent Test**: Simular uma falha de autenticação ou indisponibilidade ao buscar avaliações de um produto específico e verificar que os demais produtos/canais continuam sendo importados normalmente na mesma execução do job, com a falha registrada de forma consultável.

**Acceptance Scenarios**:

1. **Given** a credencial de acesso a um canal externo expirou ou foi revogada, **When** o job de importação tenta buscar avaliações desse canal, **Then** a falha é registrada de forma consultável, identificando o canal e o motivo, e o job continua processando os demais produtos e o outro canal.
2. **Given** a API de um canal externo está temporariamente indisponível para um produto específico, **When** o job processa os demais produtos, **Then** esses produtos continuam sendo importados normalmente na mesma execução.

---

### Edge Cases

- O que acontece se a mesma avaliação de um canal externo mudar de nota ao longo do tempo? O registro armazenado é atualizado para o valor mais recente (ver US2, cenário 4).
- O que acontece se um produto for removido do site, mas continuar tendo avaliações associadas a ele? As avaliações órfãs deixam de ser exibidas (não há mais página de produto para exibi-las) e não bloqueiam a execução do job para os demais produtos.
- O que acontece se um cliente do canal externo deixar uma avaliação sem comentário, apenas com nota? A avaliação é armazenada e exibida normalmente, mostrando a nota e omitindo o campo de comentário.
- O que acontece se o mesmo produto tiver anúncios em mais de um canal e a mesma pessoa avaliar em ambos? Cada avaliação é tratada como um registro independente, associada ao canal em que foi feita, sem tentativa de deduplicar entre pessoas.
- O que acontece se o volume de avaliações de um produto for muito grande? A seção exibe as avaliações mais recentes primeiro, com forma de ver as demais, sem carregar todas de uma vez na página.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE buscar, periodicamente e sem ação manual, as avaliações de produtos feitas nos canais Shopee e Mercado Livre, para todo produto com anúncio associado (`integracoes.shopeeItemId` e/ou `integracoes.mercadoLivreId`).
- **FR-002**: O sistema DEVE armazenar cada avaliação importada no MongoDB, associada ao produto correspondente do site, guardando no mínimo nota, comentário (quando houver), canal de origem e data da avaliação.
- **FR-003**: O sistema DEVE processar a importação de avaliações de forma idempotente — reexecutar o job para uma avaliação já importada e sem alteração no canal de origem não cria um registro duplicado.
- **FR-004**: O sistema DEVE atualizar o registro armazenado de uma avaliação já importada quando o conteúdo dela (nota e/ou comentário) for alterado no canal de origem.
- **FR-005**: O sistema DEVE ignorar, sem erro, produtos sem anúncio associado a nenhum canal externo durante a importação.
- **FR-006**: O sistema DEVE registrar, de forma consultável, toda falha ao buscar avaliações de um canal externo (ex: credencial inválida, indisponibilidade da API), identificando o canal, o produto (quando aplicável) e o motivo.
- **FR-007**: Uma falha ao importar avaliações de um produto ou canal específico NÃO DEVE impedir o processamento dos demais produtos e canais na mesma execução do job.
- **FR-008**: O sistema DEVE exibir, na página de cada produto, uma seção de "avaliações de clientes" reunindo os feedbacks do próprio site (se existirem) e os importados da Shopee e do Mercado Livre.
- **FR-009**: Cada avaliação exibida na seção DEVE indicar o canal de origem (site, Shopee ou Mercado Livre).
- **FR-010**: O sistema DEVE exibir uma mensagem apropriada na seção de avaliações quando um produto não tiver nenhuma avaliação em nenhum canal, sem erro.
- **FR-011**: Quando o volume de avaliações de um produto for grande, o sistema DEVE exibir inicialmente as mais recentes, com forma de acessar as demais, sem carregar todas de uma vez.

### Key Entities

- **Avaliação**: novo conceito desta tarefa; representa o feedback de um cliente sobre um produto, contendo nota, comentário opcional, canal de origem (site, Shopee ou Mercado Livre), identificador da avaliação no canal de origem (para permitir atualização/deduplicação) e data. Associada a um único Produto.
- **Produto**: já existe (Tarefas 2, 5 e 7); nesta tarefa passa a ser o ponto de associação das avaliações importadas, reaproveitando `integracoes.mercadoLivreId` e `integracoes.shopeeItemId` já usados pela sincronização de estoque e pelos anúncios.
- **Falha de Importação de Avaliações**: novo conceito desta tarefa — para cada tentativa de busca de avaliações que falhe, guarda o canal, o produto (quando identificável) e o motivo, permitindo consulta manual das pendências, no mesmo espírito da falha de publicação de anúncio já usada na Tarefa 7.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um visitante consegue ver, na página de qualquer produto vendido em mais de um canal, avaliações reunidas do site, da Shopee e do Mercado Livre em um único lugar, sem navegar para fora do site.
- **SC-002**: Uma nova avaliação feita na Shopee ou no Mercado Livre passa a aparecer no site em no máximo 24 horas, sem intervenção manual.
- **SC-003**: Reexecuções do job de importação nunca resultam em avaliações duplicadas para o mesmo produto.
- **SC-004**: Uma falha de importação em um canal ou produto específico nunca impede a importação dos demais produtos/canais na mesma execução.
- **SC-005**: Toda falha de importação de avaliações pode ser identificada pelo responsável pela loja sem precisar investigar registros técnicos brutos.

## Assumptions

- Esta tarefa cobre apenas a importação (leitura) de avaliações dos canais externos; responder avaliações ou moderar/ocultar feedbacks está fora do escopo desta tarefa.
- Avaliações feitas diretamente no site (se essa funcionalidade já existir ou vier a existir) são tratadas como mais um "canal de origem" na mesma seção; caso o site ainda não tenha avaliações próprias, a seção funciona normalmente exibindo apenas os canais externos.
- A autenticação (OAuth Mercado Livre e credenciais Shopee) já configurada nas Tarefas 5 e 7 é reaproveitada nesta tarefa, sem necessidade de recriação.
- A busca periódica reaproveita o mesmo tipo de mecanismo de job agendado já usado pela sincronização de estoque (Tarefa 5), sem introduzir uma nova infraestrutura de agendamento.
- Produtos sem venda em nenhum canal externo (apenas no site) simplesmente não têm avaliações externas a importar; a seção exibe apenas eventuais avaliações do site ou a mensagem de "sem avaliações".
- Avaliações não editáveis pelo cliente após a importação (o site é somente leitura em relação às avaliações de canais externos) — qualquer edição só acontece no canal de origem e é refletida na próxima execução do job (FR-004).
