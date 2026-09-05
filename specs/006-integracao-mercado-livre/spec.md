# Feature Specification: Integração com Mercado Livre (Anúncios e Vendas)

**Feature Branch**: `edilsonaandrade/edi-80-tarefa-7-integracao-com-mercado-livre`
**Created**: 2026-09-05
**Status**: Draft
**Input**: Linear EDI-80 (épico EDI-73, projeto Voxelas Duo) — "Tarefa 7: Integração com Mercado Livre": criar aplicação no painel de desenvolvedores do Mercado Livre e configurar autenticação (OAuth); enviar imagens de produto para o Mercado Livre; criar anúncio no Mercado Livre a partir dos dados do produto cadastrado no site (título, descrição, preço, fotos, estoque); atualizar estoque/preço de anúncios existentes; receber notificações de pedidos do Mercado Livre via webhook e, ao recebê-las, abater estoque no MongoDB e disparar sincronização para os demais canais (site e Shopee). Continuação da Tarefa 5 (EDI-78, já mergeada na main), que implementou o envio de quantidade em estoque do site para um anúncio já existente no Mercado Livre, mas não a criação do anúncio nem o caminho inverso (venda no Mercado Livre → abater estoque no site).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publicar um produto do site como anúncio no Mercado Livre (Priority: P1) 🎯 MVP

Como responsável pela loja, quero publicar um produto já cadastrado no site como anúncio no Mercado Livre com um único comando, para vender nesse canal sem recadastrar título, descrição, preço, fotos e estoque manualmente no painel do Mercado Livre.

**Why this priority**: É o pré-requisito de tudo o mais nesta tarefa — sem um anúncio criado e associado ao produto, não há o que atualizar (estoque/preço) nem pedido desse canal para processar.

**Independent Test**: Selecionar um produto de teste sem anúncio associado no Mercado Livre e publicá-lo; verificar que o anúncio aparece no painel do Mercado Livre com título, descrição, preço, fotos e estoque correspondentes ao produto do site.

**Acceptance Scenarios**:

1. **Given** um produto cadastrado no site sem anúncio associado no Mercado Livre, **When** o responsável pela loja publica esse produto no canal, **Then** um anúncio é criado no Mercado Livre com título, descrição, preço, fotos e estoque copiados do produto, e o produto passa a ficar associado a esse anúncio.
2. **Given** um produto que já possui anúncio associado no Mercado Livre, **When** o responsável pela loja tenta publicá-lo novamente, **Then** o sistema não cria um segundo anúncio duplicado, avisando que o produto já está publicado nesse canal.
3. **Given** um produto sem fotos cadastradas ou com dados obrigatórios ausentes para o Mercado Livre, **When** a publicação é tentada, **Then** o anúncio não é criado e a falha fica registrada de forma consultável, identificando o produto e o motivo.

---

### User Story 2 - Venda no Mercado Livre abate estoque e sincroniza os demais canais (Priority: P1)

Como responsável pela loja, quero que uma venda concluída no Mercado Livre desconte automaticamente o estoque do produto no site e avise os demais canais (Shopee), para nunca vender no site ou na Shopee um produto que já se esgotou pelo Mercado Livre.

**Why this priority**: Fecha o ciclo de sincronização multicanal iniciado na Tarefa 5 — sem o caminho Mercado Livre → site, o risco de overselling permanece justamente no canal com anúncio já publicado.

**Independent Test**: Simular o recebimento da notificação de um pedido pago no Mercado Livre para um produto de teste e verificar que o estoque desse produto no site é reduzido na quantidade vendida, e que a atualização é propagada para a Shopee quando aplicável.

**Acceptance Scenarios**:

1. **Given** um produto com anúncio ativo e estoque disponível no Mercado Livre, **When** o sistema recebe a notificação de um pedido pago desse anúncio, **Then** o estoque do produto correspondente é reduzido no site na quantidade vendida.
2. **Given** o estoque de um produto acabou de ser abatido por uma venda no Mercado Livre, **When** o abatimento é concluído, **Then** o sistema dispara a sincronização de estoque para os demais canais configurados (ex: Shopee), reaproveitando o mesmo mecanismo já usado para vendas do site.
3. **Given** a mesma notificação de pedido do Mercado Livre é recebida mais de uma vez (reenvio), **When** o sistema processa a segunda ocorrência, **Then** o estoque não é abatido novamente para o mesmo pedido.
4. **Given** um pedido do Mercado Livre referente a um produto que não tem mais correspondência no catálogo do site (ex: removido), **When** a notificação é processada, **Then** o abatimento desse item é ignorado e a situação é registrada para revisão manual, sem impedir o processamento de outras notificações.

---

### User Story 3 - Manter estoque e preço do anúncio atualizados (Priority: P2)

Como responsável pela loja, quero que alterações de estoque e preço feitas no site sejam refletidas automaticamente no anúncio já publicado no Mercado Livre, para nunca vender nesse canal por um preço desatualizado ou anunciar uma quantidade que não existe mais.

**Why this priority**: Estende a sincronização de estoque já entregue na Tarefa 5 para também cobrir preço, mantendo o anúncio fiel ao produto do site ao longo do tempo — sem isso, o anúncio criado na User Story 1 iria desatualizando aos poucos.

**Independent Test**: Alterar o preço de um produto de teste que já tem anúncio associado no Mercado Livre e verificar que o preço anunciado nesse canal passa a refletir o novo valor, sem ação manual no painel do Mercado Livre.

**Acceptance Scenarios**:

1. **Given** um produto com anúncio ativo no Mercado Livre, **When** o preço desse produto é alterado no site, **Then** o preço anunciado no Mercado Livre é atualizado para o novo valor em até poucos minutos.
2. **Given** um produto com anúncio ativo no Mercado Livre e estoque atualizado no site, **When** a sincronização de estoque roda (comportamento já existente da Tarefa 5), **Then** ela continua funcionando normalmente também para produtos publicados por esta tarefa.

---

### Edge Cases

- O que acontece se as credenciais OAuth do Mercado Livre expirarem ou forem revogadas no meio de uma publicação de anúncio ou do processamento de um pedido? A operação falha de forma registrada e consultável, sem travar outras publicações ou notificações, e retoma normalmente assim que as credenciais forem renovadas.
- O que acontece se a categoria do produto no site não tiver uma categoria correspondente no Mercado Livre? A publicação desse produto falha de forma registrada, identificando o motivo, sem impedir a publicação de outros produtos.
- O que acontece se um anúncio for pausado, removido ou alterado manualmente no painel do Mercado Livre enquanto o site tenta atualizar estoque ou preço? A tentativa de atualização falha de forma registrada (mesmo comportamento de falha de sincronização já existente na Tarefa 5), sem impedir o restante do fluxo.
- O que acontece se o webhook de pedidos do Mercado Livre notificar uma venda maior que o estoque disponível no site (ex: divergência entre canais)? O sistema não permite estoque negativo; o abatimento é limitado ao disponível e a diferença é registrada como inconsistência para revisão manual (mesmo comportamento já definido na Tarefa 5).
- O que acontece se duas notificações de pedidos diferentes do Mercado Livre chegarem quase ao mesmo tempo para o mesmo produto? Os abatimentos são aplicados de forma consistente, sem uma sobrescrever o efeito da outra.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir criar, a partir de um produto cadastrado no site, um anúncio correspondente no Mercado Livre com título, descrição, preço, fotos e quantidade em estoque copiados do produto.
- **FR-002**: O sistema DEVE enviar as fotos do produto para o Mercado Livre como parte da criação do anúncio, de forma que o anúncio publicado exiba as mesmas imagens do site.
- **FR-003**: O sistema DEVE associar o anúncio criado ao produto de origem, reaproveitando a mesma associação produto↔canal já usada pela sincronização de estoque (Tarefa 5).
- **FR-004**: O sistema NÃO DEVE criar um segundo anúncio no Mercado Livre para um produto que já possui anúncio associado nesse canal.
- **FR-005**: O sistema DEVE propagar alterações de preço do produto no site para o anúncio correspondente no Mercado Livre, além da quantidade em estoque já sincronizada pela Tarefa 5.
- **FR-006**: O sistema DEVE receber notificações de novos pedidos do Mercado Livre por meio de um endpoint de webhook.
- **FR-007**: Ao receber uma notificação de pedido do Mercado Livre, o sistema DEVE abater do estoque, no MongoDB, a quantidade vendida do produto correspondente.
- **FR-008**: O sistema DEVE processar notificações de pedido do Mercado Livre de forma idempotente — reenvio da mesma notificação não pode abater o estoque mais de uma vez para o mesmo pedido.
- **FR-009**: Após abater estoque por uma venda no Mercado Livre, o sistema DEVE disparar a sincronização de estoque para os demais canais configurados, reaproveitando a função de sincronização multicanal já existente (Tarefa 5).
- **FR-010**: O sistema NÃO DEVE permitir que o estoque de um produto fique negativo em decorrência de uma venda no Mercado Livre; se o abatimento levaria a um valor negativo, a situação deve ser registrada como inconsistência para revisão manual, sem impedir o processamento das demais notificações.
- **FR-011**: O sistema DEVE registrar, de forma consultável, toda falha ao criar ou atualizar um anúncio no Mercado Livre (ex: categoria sem correspondência, foto rejeitada, credencial inválida), identificando o produto e o motivo da falha.
- **FR-012**: O sistema DEVE tratar uma notificação de pedido do Mercado Livre referente a um produto sem correspondência no catálogo do site como uma inconsistência registrada para revisão manual, sem impedir o processamento de outras notificações.

### Key Entities

- **Produto**: já existe (Tarefas 2 e 5); ganha nesta tarefa a possibilidade de ter seu anúncio no Mercado Livre criado pelo próprio sistema, além de atualizado.
- **Anúncio (Mercado Livre)**: representa o item publicado no canal, ligado ao produto de origem; nesta tarefa passa a poder ser criado (não apenas atualizado) e a ter preço mantido em sincronia, além do estoque.
- **Notificação de Pedido (Mercado Livre)**: evento recebido via webhook representando uma venda concluída nesse canal; é o gatilho do abatimento de estoque e da sincronização multicanal nesta tarefa — equivalente, para vendas externas, ao papel que a mudança de status "pago" do Pedido do site tem na Tarefa 5.
- **Falha de Publicação/Atualização de Anúncio**: novo conceito desta tarefa — para cada tentativa de criar ou atualizar um anúncio que falhe, guarda o produto, o motivo e o momento, permitindo consulta manual das pendências de publicação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um produto cadastrado no site pode ser publicado como anúncio ativo no Mercado Livre sem edição manual de título, descrição, preço, fotos ou estoque no painel do Mercado Livre.
- **SC-002**: O estoque de um produto no site reflete uma venda concluída no Mercado Livre em poucos segundos após o recebimento da notificação.
- **SC-003**: Reenvio de uma mesma notificação de pedido do Mercado Livre nunca resulta em abatimento duplicado de estoque.
- **SC-004**: Uma alteração de preço no site é refletida no anúncio do Mercado Livre sem intervenção manual, em até poucos minutos.
- **SC-005**: Toda falha de publicação ou atualização de anúncio no Mercado Livre pode ser identificada pelo responsável pela loja sem precisar investigar registros técnicos brutos.
- **SC-006**: Uma venda simultânea do mesmo produto no site, no Mercado Livre e na Shopee nunca resulta em estoque negativo em nenhum dos canais.

## Assumptions

- A aplicação no painel de desenvolvedores do Mercado Livre e a autenticação OAuth (obtenção e renovação de token) já foram criadas e configuradas na Tarefa 5 (EDI-78) e são reaproveitadas nesta tarefa, sem necessidade de recriação.
- Esta tarefa cobre anúncios "simples", equivalentes ao modelo de produto único já existente no site (sem variações/SKUs múltiplos dentro de um mesmo anúncio).
- Cada categoria de produto do site precisa corresponder a uma categoria válida do Mercado Livre para que a publicação seja concluída; a ausência dessa correspondência é tratada como falha registrada (FR-011), não como impedimento geral da funcionalidade.
- Cancelamento ou devolução de um pedido do Mercado Livre (repor estoque) está fora do escopo desta tarefa e será tratado em tarefa própria futura, se necessário.
- A criação/atualização de anúncio é disparada por uma ação do responsável pela loja (ex: botão "publicar no Mercado Livre" no cadastro do produto); publicação automática de todo o catálogo sem ação humana está fora do escopo desta tarefa.
- Assim como na Tarefa 5, apenas o Mercado Livre e a Shopee são canais externos considerados; o checkout do site continua sem autenticação (guest), sem novos papéis de usuário introduzidos por esta tarefa.
