# Feature Specification: Notificações unificadas Mercado Pago + Mercado Livre e verificação de pagamento pendente

**Feature Branch**: `edilsonaandrade/edi-132-notificacoes-unificadas-mercado-pago-mercado-livre-e`
**Linear**: EDI-132
**Created**: 2026-10-24
**Status**: Draft
**Input**: User description: "Notificações unificadas Mercado Pago + Mercado Livre e verificação de pagamento pendente no admin. MP e ML são a mesma aplicação e têm UMA única URL de notificação. Rota única que identifica o tópico e despacha para os tratamentos existentes; aceitar formatos Webhook e IPN do MP; assinatura validada só para MP; logar falhas; pagamento inexistente responde OK com log; botão 'Verificar pagamento no Mercado Pago' no admin; conferência automática dos Pix pendentes ao abrir a lista de pedidos + cron diário; exibir motivo da falha; textos via I18N."

## Contexto

O Mercado Pago e o Mercado Livre da loja são a **mesma aplicação** e, por isso, compartilham **um único endereço de notificação**. Até 24/10/2026 esse endereço apontava para o tratamento de pedidos do Mercado Livre — os avisos de pagamento do site eram ignorados, e um Pix pago (pedido #1002) ficou "pendente" sem e-mails ao cliente e à loja. Como paliativo, o endereço foi trocado para o tratamento de pagamentos do site; desde então os avisos do Mercado Livre (vendas, perguntas, reclamações, mensagens, envios) são rejeitados e as vendas do ML deixaram de entrar no site e de abater estoque.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Todas as notificações chegam pelo endereço único (Priority: P1)

Qualquer aviso enviado pela aplicação compartilhada — pagamento do site (Mercado Pago) ou venda, pergunta, reclamação, mensagem e envio (Mercado Livre) — é reconhecido e processado pelo tratamento correto, independentemente de qual dos endereços conhecidos do site estiver configurado no painel.

**Why this priority**: Hoje um dos dois canais fica sempre sem notificação: ou o pagamento do site não confirma (cliente sem e-mail, pedido parado), ou a venda do ML não entra no site (estoque errado). É o problema que gerou o incidente.

**Independent Test**: Com o endereço único configurado, simular um aviso de pagamento do MP e um aviso de venda do ML; ambos devem ser aceitos e produzir o efeito esperado (pedido do site pago / pedido do ML registrado com estoque abatido).

**Acceptance Scenarios**:

1. **Given** um pedido do site com Pix pendente e o cliente com a página fechada, **When** o Mercado Pago avisa que o pagamento foi aprovado, **Then** o pedido vira "pago", o estoque é abatido e os e-mails de confirmação (cliente) e de venda (loja) são enviados uma única vez.
2. **Given** uma venda nova no Mercado Livre, **When** o ML envia o aviso para o endereço único, **Then** o pedido é registrado no site, o estoque é abatido e a loja é avisada por e-mail.
3. **Given** uma pergunta, reclamação, mensagem ou atualização de envio no ML, **When** o aviso chega ao endereço único, **Then** o item correspondente aparece/atualiza no admin como já faria pelo tratamento dedicado.
4. **Given** o painel configurado com qualquer um dos endereços antigos do site, **When** chega qualquer aviso de MP ou ML, **Then** ele é processado da mesma forma que pelo endereço único.
5. **Given** um aviso de pagamento do MP com assinatura inválida, **When** ele chega, **Then** é rejeitado e a rejeição fica registrada no log; avisos do ML (que não têm essa assinatura) não são rejeitados por esse motivo.
6. **Given** um aviso de pagamento que não existe no MP (ex.: simulação do painel), **When** ele chega, **Then** a resposta é de sucesso (para o MP não reenviar à toa) e o caso fica registrado no log.
7. **Given** falha temporária ao consultar o MP ou o ML, **When** o aviso chega, **Then** a resposta é de erro (para o remetente reenviar) e a falha fica registrada no log.

---

### User Story 2 - Verificar manualmente um pedido pendente no admin (Priority: P2)

No admin, ao ver um pedido do site com pagamento pendente, a loja pode clicar em "Verificar pagamento no Mercado Pago". O sistema consulta o pagamento e, se aprovado, conclui o pedido como se o aviso tivesse chegado (pago, estoque, e-mails). Se não estiver aprovado ou se a consulta falhar, o resultado e o motivo aparecem no pedido.

**Why this priority**: Substitui o procedimento manual por linha de comando usado no incidente e dá autonomia à loja para recuperar qualquer pedido que escape das notificações.

**Independent Test**: Com um pedido pendente cujo pagamento está aprovado no MP, clicar no botão no admin e confirmar que o pedido vira pago e os e-mails chegam.

**Acceptance Scenarios**:

1. **Given** pedido pendente com pagamento aprovado no MP, **When** a loja clica em "Verificar pagamento no Mercado Pago", **Then** o pedido vira "pago", os e-mails saem e a tela mostra a confirmação.
2. **Given** pedido pendente com pagamento ainda aguardando, **When** a loja verifica, **Then** a tela informa que o pagamento continua pendente e o pedido não muda.
3. **Given** pedido pendente com pagamento recusado ou expirado, **When** a loja verifica, **Then** o status da tentativa é atualizado e o motivo é exibido.
4. **Given** falha ao consultar o MP, **When** a loja verifica, **Then** é exibida a mensagem de falha e o motivo fica registrado no pedido.
5. **Given** pedido já pago, **When** a loja vê o pedido, **Then** o botão não é exibido; verificar duas vezes nunca reenvia e-mails.

---

### User Story 3 - Conferência automática dos pendentes (Priority: P3)

Pedidos do site com pagamento pendente são conferidos automaticamente no MP sempre que a loja abre a lista de pedidos no admin e, adicionalmente, uma vez por dia.

**Why this priority**: Rede de segurança que não depende de ninguém lembrar de verificar; cobre falhas futuras de notificação.

**Independent Test**: Deixar um pedido pendente cujo pagamento foi aprovado no MP, abrir a lista de pedidos no admin e ver o pedido aparecer como pago.

**Acceptance Scenarios**:

1. **Given** pedidos pendentes recentes com pagamento aprovado no MP, **When** a loja abre a lista de pedidos, **Then** eles são conferidos e passam a "pago" (com e-mails), sem a loja precisar clicar em nada.
2. **Given** a conferência diária, **When** ela roda, **Then** os pendentes recentes são conferidos da mesma forma.
3. **Given** a conferência automática falha para um pedido, **When** a loja abre o pedido, **Then** vê o motivo da falha.

---

### User Story 4 - Motivo da falha visível no pedido (Priority: P3)

Cada pedido do site guarda o resultado da última verificação/notificação de pagamento que não terminou em aprovação (ex.: "Pagamento recusado no Mercado Pago", "Falha ao consultar o Mercado Pago", "Pagamento ainda pendente"), com data/hora, e o admin exibe essa informação no detalhe do pedido e um indicador na lista.

**Why this priority**: Sem o motivo, a loja não sabe se precisa agir (contatar cliente, verificar de novo) — foi o que dificultou o diagnóstico do incidente.

**Independent Test**: Provocar uma falha de verificação e conferir que o motivo aparece no detalhe do pedido.

**Acceptance Scenarios**:

1. **Given** uma verificação que falhou, **When** a loja abre o pedido, **Then** vê o motivo e quando ocorreu.
2. **Given** um pedido que depois foi aprovado, **When** a loja abre o pedido, **Then** o motivo de falha antigo não aparece mais como problema atual.

---

### Edge Cases

- Mesmo pagamento aprovado chegando por vários caminhos ao mesmo tempo (aviso do MP, tela do cliente, botão do admin, conferência automática): pedido vira pago e e-mails saem **uma única vez**.
- Aviso de pagamento que não pertence a um pedido do site (sem referência): aceito e ignorado.
- Aviso do ML de outra aplicação (identificador diferente): aceito e ignorado, como hoje.
- Aviso com tópico desconhecido: aceito, ignorado e registrado no log.
- Aviso sem corpo legível ou sem identificação de tópico: aceito e ignorado, registrado no log.
- Pedido pendente sem nenhuma tentativa de pagamento registrada: botão informa que não há pagamento a verificar.
- Conferência automática com muitos pendentes: limitada aos pedidos recentes para não deixar a lista de pedidos lenta.
- Pagamento aprovado no MP para um pedido já cancelado no site: não altera o pedido automaticamente; o motivo é registrado para a loja decidir.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer um endereço único de notificações que identifique a origem/tópico de cada aviso (pagamento do MP; venda, pergunta, reclamação, mensagem e envio do ML) e o encaminhe ao tratamento já existente para aquele tópico.
- **FR-002**: Os endereços de notificação já existentes (pagamento e cada tópico do ML) MUST aplicar a mesma identificação e encaminhamento, de modo que qualquer um deles configurado no painel funcione para todos os tópicos.
- **FR-003**: O sistema MUST aceitar avisos de pagamento do MP nos dois formatos que o MP utiliza (o atual e o legado).
- **FR-004**: A verificação de assinatura MUST ser aplicada apenas a avisos do Mercado Pago; avisos do ML continuam validados pelo identificador da aplicação, como hoje.
- **FR-005**: Os dados do pagamento/venda MUST continuar vindo sempre de consulta direta ao MP/ML — o conteúdo do aviso é só o gatilho.
- **FR-006**: Rejeições (assinatura inválida), falhas temporárias de consulta e tópicos desconhecidos MUST ser registrados no log do servidor, com identificação suficiente para diagnóstico (tópico, id do recurso, motivo), sem dados sensíveis.
- **FR-007**: Aviso de pagamento inexistente no MP MUST receber resposta de sucesso e ser registrado no log; falha temporária MUST receber resposta de erro para permitir reenvio.
- **FR-008**: O detalhe de um pedido do site com pagamento pendente no admin MUST exibir a ação "Verificar pagamento no Mercado Pago", restrita a usuários autenticados do admin com acesso a pedidos.
- **FR-009**: A verificação (manual, automática ou por aviso) MUST, quando o pagamento estiver aprovado, concluir o pedido com o mesmo efeito do fluxo atual de aprovação (pago, estoque abatido, e-mail ao cliente, e-mail à loja), no máximo uma vez por pedido.
- **FR-010**: A verificação MUST atualizar o status da tentativa quando recusada/expirada e informar ao usuário o resultado (pago, pendente, recusado, expirado, falha).
- **FR-011**: Ao abrir a lista de pedidos no admin, o sistema MUST conferir no MP os pedidos do site pendentes criados nos últimos 7 dias, sem impedir a exibição da lista em caso de falha.
- **FR-012**: O sistema MUST executar a mesma conferência uma vez por dia, de forma automática e protegida contra acionamento não autorizado.
- **FR-013**: O sistema MUST registrar no pedido o último motivo de verificação/notificação não aprovada (motivo legível + data/hora) e limpá-lo quando o pedido for aprovado.
- **FR-014**: O admin MUST exibir esse motivo no detalhe do pedido e um indicador na lista de pedidos.
- **FR-015**: Todos os textos novos visíveis ao usuário MUST seguir o padrão de internacionalização do projeto.
- **FR-016**: Pagamento aprovado no MP para pedido cancelado no site MUST NOT reativar o pedido automaticamente; o motivo MUST ser registrado para decisão da loja.

### Key Entities

- **Notificação recebida**: aviso enviado pela aplicação compartilhada; atributos relevantes: origem (MP/ML), tópico, identificador do recurso, identificador da aplicação, assinatura (só MP).
- **Pedido (site)**: já existente; ganha o **último motivo de falha de pagamento** (texto do motivo, código, data/hora, origem: aviso/manual/automática).
- **Tentativa de pagamento**: já existente; status atualizado pelas verificações.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos Pix aprovados com a página do cliente fechada passam a "pago" e disparam os e-mails em até 5 minutos após a aprovação (via aviso) ou, no pior caso, na próxima abertura da lista de pedidos / conferência diária.
- **SC-002**: 100% das vendas do ML notificadas passam a ser registradas no site com estoque abatido, com o endereço único configurado.
- **SC-003**: A loja recupera um pedido pendente pago em 1 clique, sem uso de ferramentas técnicas.
- **SC-004**: Nenhum pedido recebe e-mail de confirmação duplicado, independentemente de quantos caminhos confirmarem o mesmo pagamento.
- **SC-005**: Toda falha de notificação ou verificação fica diagnosticável pelo motivo exibido no admin ou pelo log, sem precisar consultar o painel do MP.
- **SC-006**: A lista de pedidos do admin continua abrindo normalmente mesmo quando o MP estiver indisponível.

## Assumptions

- O MP e o ML continuarão compartilhando a mesma aplicação e um único endereço de notificação.
- O plano de hospedagem permite apenas conferência agendada diária (sem custo adicional); a conferência ao abrir a lista de pedidos complementa essa limitação.
- A janela de 7 dias para conferência automática é suficiente (Pix expira bem antes disso); pedidos mais antigos podem ser verificados manualmente.
- As regras de idempotência já existentes no fluxo de aprovação (pedido só vira pago uma vez) são reaproveitadas para garantir e-mails únicos.
- O polling da tela de pagamento do cliente continua existindo sem mudança.
- Notificações de tópicos do ML não tratados hoje (ex.: itens, preços) continuam fora de escopo — apenas registradas e ignoradas.
- A configuração do painel (endereço único) é feita manualmente pela loja após a publicação.
