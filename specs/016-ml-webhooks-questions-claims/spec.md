# Feature Specification: Webhooks de perguntas e reclamações do Mercado Livre

**Feature Branch**: `edilsonaandrade/edi-98-mercado-livre-assinar-webhooks-de-perguntas-questions-e`  
**Created**: 2026-09-17  
**Status**: Draft  
**Input**: EDI-98 — Mercado Livre: assinar webhooks de perguntas (questions) e reclamações/mensagens no site

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Responder perguntas direto pelo admin (Priority: P1)

Como administradora da loja, quero ver no admin do site as perguntas feitas nos anúncios do Mercado Livre que ainda não foram respondidas e responder direto por lá, sem precisar abrir o Mercado Livre.

**Why this priority**: Pergunta sem resposta rápida derruba reputação do vendedor e pode custar a venda — é o cenário mais frequente e mais sensível a tempo.

**Independent Test**: Simular o recebimento do tópico `questions` para uma pergunta nova; responder pelo admin e verificar que a resposta aparece no anúncio no Mercado Livre e o item some da listagem de pendentes.

**Acceptance Scenarios**:

1. **Given** um anúncio publicado no Mercado Livre, **When** um comprador faz uma pergunta nova, **Then** ela aparece na área de "Perguntas pendentes" do admin em até poucos minutos, com o texto da pergunta, o anúncio relacionado e um link para o anúncio no Mercado Livre.
2. **Given** uma pergunta pendente listada no admin, **When** a administradora digita uma resposta e confirma o envio, **Then** a resposta é publicada no anúncio no Mercado Livre e a pergunta deixa de aparecer como pendente.
3. **Given** uma pergunta já listada como pendente, **When** ela é respondida diretamente no Mercado Livre (fora do admin), **Then** ela também deixa de aparecer como pendente no admin.

---

### User Story 2 - Responder/agir em reclamações abertas (Priority: P2)

Como administradora da loja, quero ver no admin as reclamações abertas em vendas do Mercado Livre e responder/comentar direto por lá, para tratar o caso antes que vire um problema de reputação ou mediação.

**Why this priority**: Reclamação tem prazo e impacta diretamente a reputação/nível do vendedor, mas ocorre com menor frequência que perguntas.

**Independent Test**: Simular o recebimento dos tópicos `claims`/`claims_actions` para uma venda existente; enviar uma resposta pelo admin e verificar que ela é publicada na reclamação no Mercado Livre.

**Acceptance Scenarios**:

1. **Given** uma venda já registrada no site (pedido externo do canal `mercado_livre`), **When** o comprador abre uma reclamação, **Then** ela aparece na área de "Reclamações pendentes" do admin, vinculada ao pedido correspondente, com link para a reclamação no Mercado Livre.
2. **Given** uma reclamação pendente listada no admin, **When** a administradora digita uma resposta/comentário e confirma o envio, **Then** a resposta é publicada na reclamação no Mercado Livre.
3. **Given** uma reclamação listada como pendente, **When** ela é encerrada/fechada no Mercado Livre, **Then** ela deixa de aparecer como pendente no admin.

---

### User Story 3 - Responder mensagens pós-venda direto pelo admin (Priority: P3)

Como administradora da loja, quero ver no admin as mensagens pós-venda trocadas com compradores no Mercado Livre e responder direto por lá.

**Why this priority**: Mensagens pós-venda são menos frequentes e menos urgentes que perguntas e reclamações, mas seguem o mesmo padrão de atendimento.

**Independent Test**: Simular o recebimento do tópico `messages` para um pedido existente; responder pelo admin e verificar que a resposta é publicada na conversa no Mercado Livre.

**Acceptance Scenarios**:

1. **Given** uma venda registrada no site, **When** o comprador envia uma mensagem pós-venda, **Then** ela aparece na área de "Mensagens pendentes" do admin, vinculada ao pedido correspondente.
2. **Given** uma mensagem pendente listada no admin, **When** a administradora digita uma resposta e confirma o envio, **Then** a resposta é publicada na conversa no Mercado Livre.

---

### Edge Cases

- Notificação chega para um tópico ainda não assinado pela aplicação ou de uma aplicação diferente (`application_id` não corresponde) → ignorar, sem erro (mesmo padrão do webhook `orders_v2` atual).
- Notificação de reclamação (`claims`) ou mensagem (`messages`) referencia uma venda que ainda não existe como pedido externo no site → registrar mesmo assim, sem pedido vinculado, para não perder o alerta.
- Consulta à API do Mercado Livre (`GET /questions/{id}`, `GET /claims/{id}` ou equivalente para mensagens) falha temporariamente → o Mercado Livre reenvia a notificação depois; o endpoint deve responder com erro para não confirmar recebimento nesse caso (mesmo padrão do webhook `orders_v2`).
- Mesma pergunta/reclamação/mensagem gera mais de uma notificação (reenvio do ML) → não duplicar o item já listado no admin.
- Pergunta é excluída pelo comprador no Mercado Livre antes de ser respondida → deixa de aparecer como pendente no admin.
- Envio de resposta pelo admin (pergunta, reclamação ou mensagem) falha na API do Mercado Livre (erro, expiração de token, rate limit) → exibir erro para a administradora, manter o item como pendente e permitir tentar novamente.
- Reclamação exige uma ação estruturada do Mercado Livre que vai além de responder/comentar (ex.: mediação, reembolso, envio de produto de troca) → o admin continua permitindo comentar, mas a ação estruturada é feita no site do Mercado Livre pelo link fornecido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE assinar, na aplicação do Mercado Livre, os tópicos de notificação `questions`, `claims`, `claims_actions` e `messages`, além do `orders_v2` já existente.
- **FR-002**: O sistema DEVE expor um endpoint de callback para o tópico `questions`, que recebe o gatilho da notificação e busca o detalhe da pergunta via `GET /questions/{id}`.
- **FR-003**: O sistema DEVE expor um endpoint de callback para os tópicos `claims`/`claims_actions`, que recebe o gatilho da notificação e busca o detalhe da reclamação via `GET /claims/{id}`.
- **FR-004**: O sistema DEVE expor um endpoint de callback para o tópico `messages`, que recebe o gatilho da notificação e busca o detalhe da mensagem pós-venda.
- **FR-005**: O sistema DEVE validar o `application_id` da notificação recebida contra a aplicação configurada, ignorando notificações que não correspondam (mesmo padrão do webhook `orders_v2`).
- **FR-006**: O sistema DEVE persistir as perguntas, reclamações e mensagens pendentes recebidas, evitando duplicidade quando a mesma notificação é reenviada pelo Mercado Livre.
- **FR-007**: O admin do site DEVE exibir uma listagem de perguntas pendentes de resposta, com o texto da pergunta, o anúncio relacionado e um link direto para o anúncio/pergunta no portal do Mercado Livre.
- **FR-008**: O admin do site DEVE exibir uma listagem de reclamações pendentes, vinculadas ao pedido correspondente quando existir, com um link direto para a reclamação no portal do Mercado Livre.
- **FR-009**: O admin do site DEVE exibir uma listagem de mensagens pós-venda pendentes, vinculadas ao pedido correspondente, com um link direto para a conversa no portal do Mercado Livre.
- **FR-010**: O admin do site DEVE permitir responder uma pergunta diretamente pela listagem, publicando a resposta no Mercado Livre via API (equivalente a `POST /answers`).
- **FR-011**: O admin do site DEVE permitir enviar uma resposta/comentário para uma reclamação diretamente pela listagem, publicando-a no Mercado Livre via API.
- **FR-012**: O admin do site DEVE permitir enviar uma resposta para uma mensagem pós-venda diretamente pela listagem, publicando-a no Mercado Livre via API.
- **FR-013**: Toda pergunta, reclamação e mensagem listada no admin DEVE manter visível o link direto para a origem no portal do Mercado Livre, mesmo quando responder/agir é possível direto pelo admin — para permitir atuar pelo portal do Mercado Livre quando preferir.
- **FR-014**: O sistema DEVE atualizar o status de uma pergunta/reclamação/mensagem (deixar de aparecer como pendente) quando ela for respondida/encerrada, seja pelo admin ou diretamente no Mercado Livre, refletido pela chegada de uma nova notificação do mesmo tópico.
- **FR-015**: Quando o envio de uma resposta pelo admin falhar na API do Mercado Livre, o sistema DEVE exibir o erro para a administradora e manter o item como pendente, permitindo nova tentativa.

### Key Entities *(include if feature involves data)*

- **Pergunta do Mercado Livre**: id da pergunta no ML, id do anúncio/produto relacionado, texto, status (pendente/respondida), link para o Mercado Livre, datas de criação/atualização.
- **Reclamação do Mercado Livre**: id da reclamação no ML, id da venda/pedido relacionado (quando existir vínculo com pedido externo), status (aberta/fechada), motivo/tipo, link para o Mercado Livre, datas de criação/atualização.
- **Mensagem pós-venda do Mercado Livre**: id da mensagem/conversa no ML, id da venda/pedido relacionado, texto, status (pendente/respondida), link para o Mercado Livre, datas de criação/atualização.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pergunta nova feita num anúncio aparece na listagem do admin em até 5 minutos após ser feita no Mercado Livre.
- **SC-002**: Uma reclamação aberta numa venda aparece na listagem do admin em até 5 minutos após ser aberta no Mercado Livre.
- **SC-003**: Uma mensagem pós-venda nova aparece na listagem do admin em até 5 minutos após ser enviada no Mercado Livre.
- **SC-004**: 100% das perguntas/reclamações/mensagens listadas como pendentes levam, com um clique, à origem correta no portal do Mercado Livre.
- **SC-005**: Uma resposta enviada pelo admin (pergunta, reclamação ou mensagem) é publicada no Mercado Livre sem a administradora precisar abrir o portal do Mercado Livre.
- **SC-006**: Nenhuma notificação reenviada pelo Mercado Livre gera item duplicado na listagem do admin.

## Assumptions

- O vínculo de uma reclamação/mensagem com um pedido existente usa o mesmo identificador de pedido externo (`pedidoExternoId`) já usado pelo webhook `orders_v2`.
- "Pendente" para pergunta/mensagem = ainda sem resposta; para reclamação = ainda aberta (não encerrada/cancelada) no Mercado Livre.
- Responder pelo admin cobre resposta/comentário simples; reclamações que exigem ação estruturada do Mercado Livre (ex.: mediação, reembolso, envio de produto de troca) continuam sendo tratadas no portal do Mercado Livre pelo link fornecido.
- Reautenticar/registrar os tópicos na aplicação do Mercado Livre (Minhas Aplicações) é uma etapa manual de configuração, fora do código, a ser feita por quem tem acesso à conta de desenvolvedor.
