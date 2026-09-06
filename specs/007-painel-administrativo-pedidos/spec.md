# Feature Specification: Painel administrativo de pedidos

**Feature Branch**: `007-painel-administrativo-pedidos`
**Created**: 2026-09-06
**Status**: Draft
**Input**: User description: "Tarefa 8: Painel administrativo de pedidos (EDI-81) — Criar área administrativa para visualizar pedidos recebidos de todos os canais (site, Shopee, Mercado Livre) em um só lugar; exibir status de cada pedido (pago, pendente, enviado) e canal de origem; permitir atualização manual de status (ex: marcar como enviado). Restrição: ainda não há aprovação na Shopee Open Platform — a funcionalidade deve cobrir totalmente site e Mercado Livre; o canal Shopee aparece preparado na UI (filtro, badge) mas sem integração real."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver todos os pedidos em um só lugar (Priority: P1)

Como administradora da loja, quero ver em uma única lista os pedidos feitos no site e os sincronizados do Mercado Livre, para não precisar checar cada canal separadamente.

**Why this priority**: É o valor central da tarefa — sem essa lista unificada não existe painel. Sem ela, a única forma de saber o que foi vendido é olhar no MongoDB diretamente.

**Independent Test**: Pode ser testado sozinho acessando a área administrativa de pedidos e conferindo que pedidos criados pelo checkout do site e pedidos sincronizados do Mercado Livre aparecem juntos na mesma lista, cada um com seu canal de origem visível.

**Acceptance Scenarios**:

1. **Given** existem pedidos do site e do Mercado Livre no sistema, **When** a administradora abre o painel de pedidos, **Then** todos aparecem numa lista única, mais recentes primeiro, cada um mostrando canal de origem, cliente, valor total e status.
2. **Given** o painel de pedidos está vazio (nenhum pedido ainda), **When** a administradora o acessa, **Then** vê uma mensagem indicando que não há pedidos, sem erro.

---

### User Story 2 - Filtrar e localizar pedidos (Priority: P2)

Como administradora, quero filtrar os pedidos por canal e por status, para encontrar rapidamente, por exemplo, "todos os pedidos pagos do Mercado Livre" ou "pedidos ainda pendentes de envio".

**Why this priority**: Com o volume crescendo, uma lista só sem filtro perde utilidade rápido — mas o valor da US1 já existe sem isso.

**Independent Test**: Pode ser testado aplicando um filtro de canal e um filtro de status e conferindo que só os pedidos correspondentes aparecem.

**Acceptance Scenarios**:

1. **Given** há pedidos de site e Mercado Livre com status variados, **When** a administradora filtra por canal "Mercado Livre", **Then** só pedidos desse canal aparecem.
2. **Given** há pedidos com status variados, **When** a administradora filtra por status "enviado", **Then** só pedidos com esse status aparecem.
3. **Given** o filtro de canal inclui a opção "Shopee" (preparada, sem integração ativa), **When** a administradora seleciona esse filtro, **Then** o painel mostra a lista vazia com uma indicação de que a integração com a Shopee ainda não está disponível, sem erro.

---

### User Story 3 - Atualizar status manualmente (Priority: P1)

Como administradora, quero marcar um pedido como "enviado" (ou outro status) manualmente, para manter o histórico de pedidos correto quando eu mesma despachar o produto.

**Why this priority**: Sem atualização de status, o painel é só leitura e não ajuda na operação do dia a dia — é tão essencial quanto a listagem.

**Independent Test**: Pode ser testado abrindo um pedido "pago", alterando seu status para "enviado" e conferindo que a mudança é refletida na lista e persistida.

**Acceptance Scenarios**:

1. **Given** um pedido está com status "pago", **When** a administradora seleciona o novo status "enviado" e confirma, **Then** o pedido passa a exibir "enviado" na lista e o dado é persistido.
2. **Given** um pedido já está "cancelado", **When** a administradora tenta alterar seu status, **Then** o sistema permite a alteração (histórico administrativo simples, sem máquina de estados rígida) mas exige confirmação explícita antes de aplicar.

---

### Edge Cases

- O que acontece quando um pedido não tem produto correspondente no catálogo (item órfão registrado pelo webhook do Mercado Livre, ver Tarefa 7)? → Deve continuar aparecendo no painel com uma indicação de "item sem correspondência no catálogo", sem quebrar a listagem.
- Como o sistema se comporta se dois administradores tentam mudar o status do mesmo pedido ao mesmo tempo? → A última atualização confirmada prevalece; não há bloqueio otimista nesta versão.
- O que acontece se a Shopee for selecionada como filtro antes da aprovação da integração? → A UI mostra o canal como opção, mas indica claramente "integração pendente de aprovação", sem forçar chamadas a uma API inexistente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE exibir, em uma área administrativa, a lista de todos os pedidos dos canais "site" e "mercado_livre" já suportados, ordenados do mais recente para o mais antigo.
- **FR-002**: Cada pedido listado DEVE mostrar: canal de origem, status atual, valor total, dados básicos do cliente e data de criação.
- **FR-003**: O sistema DEVE permitir abrir o detalhe de um pedido para ver os itens comprados (produto, quantidade, preço unitário) e, quando aplicável, dados de pagamento.
- **FR-004**: O sistema DEVE permitir filtrar a lista de pedidos por canal de origem e por status.
- **FR-005**: O sistema DEVE permitir que uma administradora autenticada altere manualmente o status de um pedido (pendente, pago, enviado, cancelado), pedindo confirmação antes de aplicar.
- **FR-006**: O sistema DEVE registrar a alteração manual de status persistindo o novo valor e a data de atualização.
- **FR-007**: O sistema DEVE oferecer "Shopee" como opção de canal na UI de filtro (badge/seletor), mesmo sem pedidos reais desse canal, sinalizando visivelmente que a integração está pendente de aprovação — a opção não pode gerar erro ao ser selecionada.
- **FR-008**: O sistema NÃO DEVE realizar nenhuma chamada a uma API da Shopee nesta tarefa — a preparação é somente de interface (filtro, badge de canal, textos), não de integração funcional.
- **FR-009**: O sistema DEVE exibir pedidos com itens sem correspondência no catálogo (registrados pelo webhook do Mercado Livre) com uma indicação visual clara, sem quebrar a listagem.
- **FR-010**: O acesso à área administrativa de pedidos DEVE ficar restrito a usuários autenticados como administradores (reaproveitando a autenticação prevista na Tarefa 9 — enquanto essa tarefa não estiver pronta, a rota segue a mesma proteção/placeholder já usado nas demais áreas `/admin` do projeto).

### Key Entities *(include if feature involves data)*

- **Pedido**: entidade já existente (`lib/models/pedido.ts`) — itens, cliente, status, canal de origem, valor total, dados de pagamento e, quando aplicável, origem externa (canal + id externo). Esta tarefa consome e atualiza o campo `status`; não altera o formato existente.
- **Canal de origem (UI)**: representação visual dos três canais possíveis (site, Mercado Livre, Shopee) usada em filtros e badges — Shopee é o único sem dados reais por trás nesta tarefa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma administradora consegue localizar qualquer pedido específico (por canal e status) em menos de 15 segundos a partir da abertura do painel.
- **SC-002**: 100% dos pedidos existentes no site e no Mercado Livre aparecem no painel, sem nenhum pedido "invisível".
- **SC-003**: Uma atualização de status feita no painel é refletida na listagem imediatamente após a confirmação, sem necessidade de recarregar a página manualmente.
- **SC-004**: Selecionar o filtro "Shopee" nunca resulta em erro visível ou tela quebrada, mesmo sem integração real.

## Assumptions

- A autenticação/proteção do painel administrativo (Tarefa 9 / EDI-86) pode não estar pronta ainda quando esta tarefa for implementada; nesse caso, a rota reaproveita o mesmo mecanismo de proteção (ou placeholder) já usado nas demais telas `/admin` existentes, e passa a usar o login real assim que a Tarefa 9 for concluída.
- "Atualização manual de status" não implementa uma máquina de estados rígida (ex: não pode ir de pago para enviado) — a administradora pode escolher qualquer status, mediante confirmação, pois é ela quem opera o processo manualmente.
- A aprovação da Shopee Open Platform está fora do controle desta tarefa; o card (EDI-81) já está anotado para revisão quando a aprovação sair, e a integração real da Shopee será tratada como trabalho futuro, não como parte desta especificação.
- O volume de pedidos é o de uma loja pequena/média (não são esperados milhares de pedidos simultâneos), então paginação simples é suficiente, sem necessidade de otimizações de performance especiais.
