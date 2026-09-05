# Feature Specification: Abatimento de Estoque e Sincronização Multicanal

**Feature Branch**: `edilsonaandrade/edi-78-tarefa-5-abatimento-de-estoque-e-sincronizacao-ao-vender-no`
**Created**: 2026-09-04
**Status**: Draft
**Input**: Linear EDI-78 (épico EDI-73, projeto Voxelas Duo) — "Tarefa 5: Abatimento de estoque e sincronização ao vender no site": ao confirmar uma venda no site, abater o estoque no MongoDB (fonte da verdade) e sincronizar a quantidade atualizada com Shopee e Mercado Livre, tratando falhas de sincronização sem deixar o estoque desalinhado entre canais. Continuação da Tarefa 4 (EDI-77, pagamento), já mergeada na main, que confirma pedidos como "pago" mas explicitamente não altera estoque.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estoque é abatido automaticamente ao confirmar o pagamento (Priority: P1) 🎯 MVP

Como responsável pela loja, quero que a quantidade vendida seja descontada do estoque assim que um pedido do site for confirmado como pago, para que o número de unidades disponíveis sempre reflita a realidade sem trabalho manual.

**Why this priority**: É a base de toda a tarefa — sem abatimento correto no MongoDB (fonte da verdade), qualquer sincronização com canais externos propagaria números errados.

**Independent Test**: Confirmar o pagamento de um pedido de teste com itens conhecidos e verificar que o campo de estoque de cada produto envolvido foi reduzido exatamente na quantidade comprada.

**Acceptance Scenarios**:

1. **Given** um pedido "pendente" com 2 unidades de um produto com 10 em estoque, **When** o pagamento desse pedido é confirmado, **Then** o estoque do produto passa a 8.
2. **Given** um pedido com itens de mais de um produto, **When** o pagamento é confirmado, **Then** o estoque de cada produto do pedido é abatido na quantidade correspondente.
3. **Given** a mesma confirmação de pagamento é recebida mais de uma vez (reenvio de notificação), **When** o sistema processa a segunda ocorrência, **Then** o estoque não é abatido novamente para o mesmo pedido.

---

### User Story 2 - Estoque atualizado é refletido no Mercado Livre (Priority: P1)

Como responsável pela loja, quero que a quantidade anunciada no Mercado Livre seja atualizada automaticamente depois de uma venda no site, para não vender no Mercado Livre um produto que já se esgotou pelo site.

**Why this priority**: É o valor central da sincronização multicanal — sem isso, o risco de vender o mesmo item duas vezes (overselling) permanece.

**Independent Test**: Confirmar o pagamento de um pedido de um produto com anúncio ativo no Mercado Livre e verificar que a quantidade anunciada nesse canal passa a refletir o novo estoque.

**Acceptance Scenarios**:

1. **Given** um produto com anúncio ativo no Mercado Livre e estoque sincronizado, **When** uma venda no site abate esse estoque, **Then** a quantidade anunciada no Mercado Livre é atualizada para o novo valor em até poucos minutos.
2. **Given** um produto vendido no site que não possui anúncio associado no Mercado Livre, **When** o estoque é abatido, **Then** nenhuma chamada de sincronização é feita para esse canal e nenhum erro impede o restante do processamento do pedido.

---

### User Story 3 - Falhas de sincronização não deixam o estoque desalinhado silenciosamente (Priority: P2)

Como responsável pela loja, quero que falhas temporárias ao avisar um canal externo sejam automaticamente reprocessadas, e que falhas persistentes fiquem registradas de forma visível, para que eu nunca seja surpreendido vendendo um produto sem saber que o estoque estava desatualizado em algum canal.

**Why this priority**: Cobre o caso de erro inevitável (indisponibilidade da API externa, credencial expirada, etc.) — sem isso, uma falha pontual poderia gerar desalinhamento permanente e não percebido.

**Independent Test**: Simular uma falha temporária na chamada de sincronização de um canal e verificar que o sistema tenta novamente automaticamente; simular uma falha persistente e verificar que ela fica registrada para consulta, sem travar o abatimento de estoque no MongoDB nem o processamento do pedido.

**Acceptance Scenarios**:

1. **Given** uma tentativa de sincronização com um canal externo falha por indisponibilidade temporária, **When** o sistema reprocessa automaticamente, **Then** a sincronização é concluída com sucesso em uma tentativa seguinte sem intervenção manual.
2. **Given** as tentativas automáticas de sincronização com um canal se esgotam sem sucesso, **When** isso acontece, **Then** o sistema registra a falha de forma consultável, identificando produto, canal e motivo, sem reverter o abatimento já feito no MongoDB.
3. **Given** um canal externo está com falha de sincronização, **When** uma nova venda do mesmo ou de outro produto acontece, **Then** o abatimento de estoque no MongoDB e a sincronização com os demais canais continuam funcionando normalmente.

---

### Edge Cases

- O que acontece se um canal externo (ex: Shopee) ainda não tiver credenciais configuradas/aprovadas? O sistema trata esse canal como "não configurado": não tenta sincronizar, não gera erro, e retoma a sincronização normalmente assim que o canal for configurado.
- O que acontece se o abatimento levaria o estoque a um valor negativo (ex: duas vendas quase simultâneas do último item, uma delas em canal externo ainda não coberto por esta tarefa)? O sistema não permite estoque negativo; a venda no site já foi paga e não pode ser desfeita automaticamente aqui, então a inconsistência é registrada para revisão manual.
- O que acontece se o pedido pago envolver um produto que já foi removido do catálogo? O abatimento é ignorado para esse item e a situação é registrada para revisão manual, sem impedir o processamento dos demais itens do pedido.
- O que acontece se dois pedidos forem confirmados como pagos ao mesmo tempo, ambos afetando o estoque do mesmo produto? Os abatimentos devem ser aplicados de forma consistente (sem uma sobrescrever o efeito da outra).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE abater do estoque, no MongoDB, a quantidade de cada item de um pedido assim que esse pedido for confirmado como "pago".
- **FR-002**: O sistema DEVE processar o abatimento de estoque de forma idempotente — reenvio da mesma confirmação de pagamento não pode abater o estoque mais de uma vez para o mesmo pedido.
- **FR-003**: O sistema DEVE aplicar o abatimento de forma segura em relação a vendas concorrentes, sem permitir que duas atualizações simultâneas do mesmo produto se percam ou sobrescrevam uma à outra.
- **FR-004**: O sistema NÃO DEVE permitir que o estoque de um produto fique negativo; se o abatimento normal levaria a um valor negativo, a operação sobre aquele item deve ser registrada como inconsistência para revisão manual, sem impedir o restante do fluxo.
- **FR-005**: O sistema DEVE oferecer uma função única e reutilizável de "atualizar estoque em todos os canais", disparada após o abatimento no MongoDB, responsável por propagar a nova quantidade para cada canal de venda externo configurado (Shopee, Mercado Livre).
- **FR-006**: O sistema DEVE tratar cada canal de forma independente: uma falha ou indisponibilidade em um canal não pode impedir a sincronização com os demais canais nem o abatimento no MongoDB.
- **FR-007**: O sistema DEVE tratar um canal sem credenciais configuradas/aprovadas como "não configurado", sem tentar sincronizar e sem gerar erro nesse canal.
- **FR-008**: O sistema DEVE reprocessar automaticamente falhas de sincronização com um canal externo (ex: erro de rede, indisponibilidade momentânea) por um número limitado de tentativas, com espaçamento crescente entre elas.
- **FR-009**: O sistema DEVE registrar, de forma consultável, toda falha de sincronização que persista após esgotadas as tentativas automáticas, identificando o produto, o canal e o motivo da falha.
- **FR-010**: O sistema DEVE permitir identificar produtos com sincronização pendente ou falha para que o responsável pela loja possa agir manualmente quando necessário.
- **FR-011**: O sistema DEVE sincronizar apenas a quantidade em estoque anunciada em cada canal (não preço, descrição ou outros dados do anúncio).

### Key Entities

- **Produto**: já existe (Tarefa 2); ganha nesta tarefa a associação com o(s) anúncio(s) correspondente(s) em cada canal externo (Shopee, Mercado Livre), usada para saber para onde enviar a atualização de quantidade.
- **Pedido**: já existe (Tarefas 3 e 4); seu evento de mudança para "pago" é o gatilho do abatimento de estoque desta tarefa.
- **Registro de Sincronização de Estoque**: novo conceito desta tarefa — para cada produto/canal afetado por uma venda, guarda o status da sincronização (pendente, sincronizado, falhou), o número de tentativas e o motivo do último erro, permitindo tanto o reprocessamento automático quanto a consulta manual de pendências.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O estoque de um produto no MongoDB reflete uma venda do site em poucos segundos após a confirmação do pagamento.
- **SC-002**: A quantidade anunciada no Mercado Livre reflete uma venda do site em poucos minutos, sem ação manual do responsável pela loja.
- **SC-003**: Reenvio de uma mesma confirmação de pagamento nunca resulta em abatimento duplicado de estoque.
- **SC-004**: Falhas temporárias de comunicação com um canal externo se recuperam automaticamente, sem exigir intervenção manual, na grande maioria dos casos.
- **SC-005**: Todo produto com sincronização pendente ou com falha persistente pode ser identificado pelo responsável pela loja sem precisar investigar registros técnicos brutos.
- **SC-006**: A indisponibilidade ou ausência de configuração de um canal de venda nunca impede a conclusão de uma venda no site nem a sincronização dos demais canais.

## Assumptions

- Esta tarefa cobre apenas o caminho site → MongoDB → canais externos (Shopee, Mercado Livre). O caminho inverso (venda nascida na Shopee ou no Mercado Livre → abater estoque no MongoDB) está fora de escopo e será tratado em tarefa própria futura, conforme observação já registrada no ticket EDI-78.
- Mercado Livre: já existem credenciais de desenvolvedor disponíveis; a sincronização com este canal é implementada e validada de ponta a ponta nesta tarefa.
- Shopee: o cadastro de aplicativo na Shopee Open Platform está em análise ("Under Review") no momento desta especificação. O canal Shopee é construído para se comportar como "não configurado" (ver FR-007) enquanto não houver credenciais aprovadas, e passa a sincronizar de fato assim que forem configuradas — sem exigir mudança no restante do fluxo.
- Cada produto pode não ter anúncio em todos os canais; a ausência de associação com um canal é tratada como "canal não aplicável a este produto", não como erro.
- A criação/edição de anúncios nos canais externos está fora de escopo — esta tarefa assume que o anúncio já existe em cada canal e apenas atualiza a quantidade.
- Apenas pedidos que atingem o status "pago" disparam abatimento de estoque; pedidos pendentes, recusados ou expirados não afetam estoque (mantendo o comportamento já definido na Tarefa 4).
- O checkout continua sem autenticação (guest), como definido na Tarefa 3; esta tarefa não introduz papéis de usuário ou permissões novas.
