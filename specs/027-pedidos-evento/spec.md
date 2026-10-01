# Feature Specification: Pedidos de evento

**Feature Branch**: `edilsonaandrade/edi-125-pedidos-de-evento-no-admin-mobile-first-offline-e-login-da`
**Linear**: EDI-125
**Created**: 2026-10-01
**Status**: Draft
**Input**: User description: "Área no admin, mobile-first, para anotar pedidos de impressão 3D feitos por clientes em eventos presenciais, com fila offline, lista/edição de pedidos e logins simples da equipe (malu, isadora, ana, edilson)."

## Contexto

Em feiras e eventos presenciais (Piracicaba), clientes pedem peças para imprimir. Quem anota os pedidos são principalmente duas adolescentes, de 16 e 12 anos, no celular, em pé, com o cliente na frente e a internet instável. Os pedidos do evento são tratados à parte das encomendas feitas pelo site, para saber a origem de cada um e servir de base a um futuro CRM. Depois do evento, o contato com o cliente acontece pelo WhatsApp.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anotar um pedido no evento (Priority: P1)

Durante o evento, a pessoa da equipe abre a tela de pedidos no celular, confirma o evento (já preenchido) e informa o nome do cliente, o WhatsApp e um ou mais itens. Cada item tem foto e/ou descrição, além da quantidade. Ela toca em "Salvar pedido", vê uma confirmação clara com o nome do cliente e o formulário fica limpo para o próximo cliente, mantendo o evento.

**Why this priority**: É o motivo da funcionalidade existir. Sem isso, os pedidos voltam a ser anotados em papel e se perdem.

**Independent Test**: Entrar com um usuário da equipe, anotar um pedido com dois itens (um com foto, outro só com texto) e conferir que ele foi salvo com o nome de quem anotou.

**Acceptance Scenarios**:

1. **Given** uma pessoa da equipe logada na tela de pedidos, **When** preenche nome, WhatsApp e um item com descrição e quantidade 2 e toca em "Salvar pedido", **Then** aparece a confirmação "Pedido de <nome> salvo", o formulário fica limpo e o evento continua preenchido.
2. **Given** o formulário aberto, **When** ela toca em "+ Outro item", **Then** aparece um novo bloco de item com quantidade 1, sem perder o que já foi digitado.
3. **Given** um item, **When** ela toca em "Tirar foto", **Then** a câmera do celular abre e a foto aparece em miniatura no item.
4. **Given** um item sem foto e sem descrição, **When** ela tenta salvar, **Then** o pedido não é salvo e aparece, junto ao item, a mensagem "Coloque uma foto ou escreva o que é", com todo o resto preservado.
5. **Given** nome ou WhatsApp vazio ou WhatsApp incompleto, **When** ela tenta salvar, **Then** aparece a mensagem junto ao campo com problema e a tela leva até ele.
6. **Given** dois itens, **When** ela toca na lixeira de um item, **Then** é pedida uma confirmação antes de remover. O último item restante não pode ser removido.

---

### User Story 2 - Funcionar sem internet (Priority: P1)

Se a internet cair ou ficar lenta, a pessoa continua anotando normalmente. O pedido fica guardado no celular como "aguardando envio" e é enviado sozinho quando a conexão voltar, sem ela precisar fazer nada e sem duplicar.

**Why this priority**: A conexão no evento é instável, e o atendimento não pode parar nem perder pedidos.

**Independent Test**: Colocar o celular em modo avião, anotar dois pedidos (um com foto), conferir que aparecem como "aguardando envio", desligar o modo avião e conferir que os dois aparecem como enviados, cada um uma única vez.

**Acceptance Scenarios**:

1. **Given** o aparelho sem conexão, **When** a pessoa salva um pedido, **Then** a confirmação aparece igual e o pedido fica marcado como "aguardando envio".
2. **Given** pedidos aguardando envio, **When** a conexão volta (ou a tela é reaberta com conexão), **Then** eles são enviados automaticamente, fotos incluídas, e passam a "enviado".
3. **Given** um envio interrompido no meio, **When** ele é repetido, **Then** o pedido existe uma única vez no sistema.
4. **Given** pedidos pendentes, **When** a pessoa olha a tela, **Then** vê um indicador sempre visível com a quantidade pendente (ex.: "2 aguardando internet") e um aviso para não sair do sistema nem limpar o navegador até enviar.
5. **Given** o navegador fechado com pedidos pendentes, **When** a tela é aberta de novo no mesmo aparelho, **Then** os pendentes continuam lá e voltam a ser enviados.

---

### User Story 3 - Entrar com o próprio usuário (Priority: P1)

Cada pessoa da equipe (malu, isadora, ana, edilson) entra com o seu usuário e senha, que o navegador pode lembrar. Esses usuários só acessam a área de pedidos de evento. Um botão "Sair" permite trocar de pessoa no mesmo celular.

**Why this priority**: Registrar quem anotou cada pedido depende disso, e as adolescentes não devem acessar produtos, preços e demais áreas do admin.

**Independent Test**: Entrar como "isadora", anotar um pedido, conferir "anotado por isadora" e tentar abrir uma página de produtos do admin, que deve ser negada.

**Acceptance Scenarios**:

1. **Given** a tela de entrada, **When** a pessoa informa usuário e senha corretos, **Then** entra direto na tela de pedidos de evento, e o navegador oferece salvar a senha.
2. **Given** um usuário da equipe logado, **When** tenta acessar outra área do admin, **Then** o acesso é negado e ele volta para a tela de pedidos de evento.
3. **Given** um usuário logado, **When** toca em "Sair", **Then** volta para a tela de entrada. Se houver pedidos pendentes de envio, aparece antes um aviso pedindo para esperar a internet.
4. **Given** usuário ou senha errados, **When** tenta entrar, **Then** vê "Usuário ou senha incorretos" sem perder o que digitou no campo de usuário.

---

### User Story 4 - Ver, buscar e editar pedidos (Priority: P2)

Na lista de pedidos, todos da equipe veem os pedidos de todos, com o nome de quem anotou, o evento, o cliente, os itens e o status. Dá para buscar por nome ou WhatsApp e abrir um pedido para incluir itens, mudar quantidades, acrescentar observação ou mudar o status, por exemplo quando o cliente volta e pede mais uma peça.

**Why this priority**: É comum o cliente voltar ao estande e mudar o pedido; sem a edição, o mesmo cliente acabaria com pedidos duplicados.

**Independent Test**: Anotar um pedido da "Ana", buscar "ana" na lista, abrir, incluir um item, aumentar a quantidade de outro e salvar; conferir que continua um único pedido com as alterações.

**Acceptance Scenarios**:

1. **Given** pedidos anotados por pessoas diferentes, **When** qualquer uma abre a lista, **Then** vê todos, do mais recente para o mais antigo, com quem anotou cada um.
2. **Given** a lista, **When** digita parte do nome ou do WhatsApp na busca, **Then** a lista mostra só os pedidos correspondentes; no telefone, só os dígitos contam.
3. **Given** um pedido aberto, **When** inclui um item ou altera uma quantidade e salva, **Then** o mesmo pedido é atualizado, sem criar outro.
4. **Given** um pedido, **When** muda o status (anotado → orçado → em produção → pronto → entregue), **Then** o novo status aparece na lista.
5. **Given** a lista, **When** filtra por evento, **Then** vê só os pedidos daquele evento (por padrão, o evento atual).

---

### User Story 5 - Chamar o cliente no WhatsApp (Priority: P3)

Em cada pedido há um botão "Chamar no WhatsApp", que abre a conversa com o cliente com uma mensagem pronta citando o nome dele e o evento.

**Why this priority**: Agiliza o contato pós-evento, mas o pedido pode ser anotado sem isso.

**Independent Test**: Abrir um pedido, tocar no botão e conferir que o WhatsApp abre no número do cliente com a mensagem pronta.

**Acceptance Scenarios**:

1. **Given** um pedido do cliente "Ana" no evento "Feira de Sábado", **When** toca em "Chamar no WhatsApp", **Then** abre a conversa com o número dela e o texto "Oi, Ana! Aqui é da Voxelas Duo, sobre o seu pedido na Feira de Sábado…".

---

### Edge Cases

- **Foto muito grande** tirada pela câmera: é reduzida no próprio aparelho antes de guardar e enviar, para caber na fila offline e enviar rápido.
- **Mesmo cliente anotado duas vezes** (mesmo WhatsApp no mesmo evento): ao salvar, o sistema avisa "Já existe pedido da Ana neste evento" e oferece abrir o pedido existente ou salvar mesmo assim.
- **Edição offline** de um pedido já enviado: a alteração também entra na fila e é enviada depois. Se duas pessoas editarem o mesmo pedido, vale a última alteração enviada.
- **Sessão expirada** com pedidos pendentes: os pendentes não se perdem; ao entrar de novo no mesmo aparelho, o envio continua.
- **Armazenamento do aparelho cheio**: o pedido não é salvo e aparece uma mensagem clara pedindo para liberar espaço ou esperar a internet. Nunca há sucesso falso.
- **Erro do servidor ao enviar** (que não seja falta de internet): o pedido continua pendente, com o indicador de erro e a opção "Tentar de novo". Erros de validação do servidor são mostrados no pedido.
- **Quantidade**: mínimo 1, sem campo livre que aceite zero ou negativo. O máximo é 999.
- **Telefone**: aceita celular ou fixo com DDD (10 ou 11 dígitos). É gravado só com dígitos e exibido com máscara.
- **Rascunho**: se a tela for fechada ou recarregada no meio do preenchimento, o rascunho volta ao reabrir.

## Requirements *(mandatory)*

### Functional Requirements

**Pedido**

- **FR-001**: O sistema MUST permitir registrar um pedido de evento com: evento (obrigatório), nome do cliente (obrigatório, livre, de 2 a 60 caracteres), WhatsApp/telefone (obrigatório, 10 ou 11 dígitos), um ou mais itens, valor/sinal combinado (opcional, em reais) e observação (opcional, até 500 caracteres).
- **FR-002**: Cada item MUST ter quantidade (inteiro de 1 a 999, padrão 1) e pelo menos uma foto ou uma descrição (até 200 caracteres). O item MUST aceitar até 3 fotos.
- **FR-003**: O campo de evento MUST vir preenchido com o último evento usado naquele aparelho e permitir escolher um evento já existente ou criar um novo pelo nome.
- **FR-004**: O sistema MUST registrar automaticamente quem anotou o pedido (o usuário logado) e quando.
- **FR-005**: Todo pedido MUST ter um status interno com os valores anotado, orçado, em produção, pronto e entregue. Começa em "anotado" e pode ser alterado livremente. O cliente nunca vê esse status.
- **FR-006**: Os pedidos de evento MUST ficar separados das encomendas feitas pelo site, identificados como origem "evento".
- **FR-007**: Não MUST haver opção de excluir pedido na área de pedidos de evento.

**Formulário e usabilidade**

- **FR-008**: A tela MUST ser projetada primeiro para celular: um campo por linha, alvos de toque de pelo menos 48px, texto base de 16px ou mais (sem zoom automático) e botão principal de salvar sempre alcançável.
- **FR-009**: O campo de WhatsApp MUST abrir o teclado numérico e aplicar a máscara (19) 99999-9999 enquanto se digita.
- **FR-010**: A quantidade MUST ser ajustada com botões − e + grandes.
- **FR-011**: O botão de foto MUST abrir a câmera do aparelho e também permitir escolher da galeria.
- **FR-012**: As mensagens de erro MUST aparecer junto ao campo, em linguagem simples, sem apagar nada do que foi digitado, e a tela MUST rolar até o primeiro erro.
- **FR-013**: Valor/sinal e observação MUST ficar recolhidos em "Mais detalhes", para não poluir o fluxo principal.
- **FR-014**: Remover um item MUST pedir confirmação; o último item não pode ser removido.
- **FR-015**: Após salvar, o sistema MUST mostrar confirmação com o nome do cliente e limpar o formulário, mantendo o evento.
- **FR-016**: O rascunho do formulário MUST ser preservado no aparelho até ser salvo ou descartado de propósito.
- **FR-017**: Ao salvar um WhatsApp que já tem pedido no mesmo evento, o sistema MUST avisar e oferecer abrir o pedido existente ou salvar mesmo assim.

**Offline**

- **FR-018**: Pedidos novos e edições MUST poder ser salvos sem conexão, ficando numa fila no aparelho com fotos incluídas.
- **FR-019**: A fila MUST ser enviada automaticamente quando houver conexão (ao reconectar, ao abrir a tela e periodicamente), sem ação do usuário, e MUST oferecer também "Tentar de novo".
- **FR-020**: Reenvios MUST nunca duplicar um pedido.
- **FR-021**: A tela MUST mostrar sempre o estado da fila: tudo enviado, quantidade aguardando internet ou erro no envio.
- **FR-022**: A fila MUST sobreviver ao fechamento do navegador e à reinicialização do aparelho.
- **FR-023**: Fotos MUST ser reduzidas no aparelho antes de entrar na fila (lado maior de até 1600px, em formato comprimido).

**Lista e edição**

- **FR-024**: A lista MUST mostrar todos os pedidos de evento para qualquer usuário da equipe, do mais recente para o mais antigo, com cliente, WhatsApp, evento, resumo dos itens, status e quem anotou. Os pedidos ainda na fila do aparelho aparecem marcados como "aguardando envio".
- **FR-025**: A lista MUST permitir busca por parte do nome ou do WhatsApp (no telefone, só os dígitos contam) e filtro por evento.
- **FR-026**: Abrir um pedido MUST permitir editar todos os campos, incluir e remover itens, alterar quantidades e status, reaproveitando o mesmo formulário.
- **FR-027**: Cada pedido MUST ter o botão "Chamar no WhatsApp", que abre a conversa com o número do cliente e uma mensagem pronta com o nome do cliente e o evento.

**Acesso**

- **FR-028**: O sistema MUST ter quatro usuários da equipe: malu, isadora, ana e edilson, com senha definida pelo dono. As senhas MUST ser guardadas apenas de forma protegida (hash), nunca em texto puro no código ou no repositório.
- **FR-029**: Usuários da equipe MUST acessar somente a área de pedidos de evento; qualquer outra área do admin MUST ser negada a eles. O administrador atual continua com acesso total, incluindo essa área.
- **FR-030**: A tela de entrada MUST permitir que o navegador salve e preencha usuário e senha.
- **FR-031**: MUST existir um botão "Sair" visível; se houver pedidos pendentes de envio, o sistema MUST avisar antes de sair, e os pendentes permanecem no aparelho para envio no próximo login.
- **FR-032**: A sessão da equipe MUST durar o suficiente para um dia de evento sem pedir senha de novo (pelo menos 12 horas).
- **FR-033**: Tentativas de login MUST ter proteção contra tentativa e erro em massa.

**Geral**

- **FR-034**: Todos os textos da interface MUST seguir o padrão de textos (i18n) já usado no projeto.
- **FR-035**: Erros de comunicação com o servidor MUST ficar visíveis na aba de rede do navegador (sem mascarar códigos de erro como sucesso).

### Key Entities

- **Evento**: feira ou ocasião presencial. Tem nome e data, e agrupa os pedidos.
- **Pedido de evento**: pedido de um cliente num evento. Tem nome do cliente, WhatsApp (só dígitos), valor/sinal opcional, observação, status interno, quem anotou, quando, e um identificador gerado no aparelho, que garante que não haja duplicação.
- **Item do pedido**: o que o cliente quer. Tem descrição opcional, quantidade, até 3 fotos e posição na lista.
- **Usuário da equipe**: pessoa autorizada a anotar pedidos de evento. Tem nome de usuário, senha protegida e acesso restrito a essa área.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa da equipe anota um pedido de 1 item (com foto) em até 60 segundos e um de 3 itens em até 2 minutos, no celular.
- **SC-002**: A usuária de 12 anos consegue anotar, buscar e editar um pedido na primeira tentativa, depois de no máximo 2 minutos de explicação.
- **SC-003**: 0 pedidos perdidos ou duplicados num teste com 10 pedidos anotados alternando entre online e offline.
- **SC-004**: Pedidos anotados offline aparecem para os outros usuários em até 1 minuto após a conexão voltar.
- **SC-005**: A busca por nome ou WhatsApp encontra o pedido certo digitando no máximo 4 caracteres, numa lista de 100 pedidos.
- **SC-006**: 100% das tentativas de um usuário da equipe abrir outra área do admin são negadas.

## Assumptions

- Os usuários usam celulares modernos (Android ou iPhone), com navegador atualizado e câmera.
- Os 4 usuários e a senha inicial são criados por um script/rotina de configuração executado pelo dono. A senha não aparece no código. Trocar a senha pela interface fica fora do escopo.
- A fila offline vale por aparelho: pedidos pendentes num celular não aparecem nos outros até serem enviados.
- Funcionamento offline da tela pressupõe que ela tenha sido aberta ao menos uma vez com internet no aparelho (antes do evento).
- O valor/sinal é apenas informativo; não há cobrança nem integração com pagamento nessa área.
- O cliente não recebe e-mail nem mensagem automática; o contato é feito manualmente pelo WhatsApp.
- Converter um pedido de evento em pedido da loja, gerar orçamento e montar o CRM ficam fora do escopo; a estrutura só não deve impedir isso depois.
- O projeto hoje tem os textos em pt-BR direto nos componentes; "seguir o padrão i18n" significa seguir esse padrão existente.
