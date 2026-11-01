# Feature Specification: Frete no checkout (PAC, SEDEX e combinar com a loja)

**Feature Branch**: `claude/frete-por-cep-ebmhxw`
**Created**: 2026-11-01
**Status**: Draft
**Input**: User description: "Frete no checkout do site (sem ticket no Linear). Sem contrato com os Correios e sem integração com API de frete por enquanto. No checkout o cliente escolhe entre 3 opções de entrega: PAC, SEDEX e 'Combinar entrega com a loja' (grátis). PAC e SEDEX têm valor fixo por pedido, configurável no admin, nascendo com PAC = R$ 19,90 e SEDEX = R$ 25,50. No futuro o valor calculado por CEP/peso substituirá o fixo quando houver peso e for possível calcular, com fallback para o valor fixo. O frete entra no total cobrado, é validado no servidor e fica salvo no pedido (admin, minha conta e e-mail)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cliente escolhe a forma de entrega no checkout (Priority: P1)

Ao finalizar a compra, o cliente vê três formas de entrega: **PAC**, **SEDEX** e **Combinar entrega com a loja**. Cada uma mostra seu valor (a de combinar aparece como "Grátis"). O cliente escolhe uma, vê o resumo com subtotal dos produtos, frete e total, e paga o total com o frete incluído.

**Why this priority**: Hoje a loja paga o envio do próprio bolso, porque o pedido não cobra frete. Isso é o núcleo da funcionalidade.

**Independent Test**: Colocar um produto no carrinho, ir ao checkout, escolher SEDEX e confirmar que o total exibido e o valor cobrado no pagamento são subtotal + R$ 25,50.

**Acceptance Scenarios**:

1. **Given** um carrinho com produtos de subtotal R$ 50,00 e os valores padrão, **When** o cliente escolhe PAC, **Then** o resumo mostra Frete R$ 19,90 e Total R$ 69,90, e o pagamento é cobrado em R$ 69,90.
2. **Given** o mesmo carrinho, **When** o cliente escolhe SEDEX, **Then** o resumo mostra Frete R$ 25,50 e Total R$ 75,50.
3. **Given** o mesmo carrinho, **When** o cliente escolhe "Combinar entrega com a loja", **Then** o resumo mostra Frete "Grátis" e Total R$ 50,00, com um aviso de que a loja entrará em contato para combinar a entrega ou retirada.
4. **Given** o cliente não escolheu nenhuma forma de entrega, **When** tenta finalizar, **Then** o pedido não é criado e aparece uma mensagem pedindo a escolha da forma de entrega.
5. **Given** um cliente que alterou manualmente o valor do frete enviado pelo navegador, **When** o pedido é criado, **Then** o sistema ignora o valor recebido e usa o valor calculado pela loja, ou recusa o pedido com erro visível se o valor exibido ao cliente divergir do valor vigente.

---

### User Story 2 - Lojista configura os valores do frete (Priority: P2)

No admin, nas configurações, o lojista vê e edita o valor do PAC e o valor do SEDEX. Os valores nascem com PAC = R$ 19,90 e SEDEX = R$ 25,50. Ao salvar, os novos valores passam a valer nos próximos checkouts.

**Why this priority**: O preço dos Correios muda e o lojista precisa ajustar sem depender de alteração no sistema. Os valores iniciais já permitem operar sem esta tela.

**Independent Test**: Alterar o SEDEX para R$ 28,00 no admin, abrir o checkout e confirmar que o SEDEX aparece com R$ 28,00.

**Acceptance Scenarios**:

1. **Given** nenhuma configuração de frete foi salva antes, **When** o lojista abre as configurações, **Then** vê PAC = R$ 19,90 e SEDEX = R$ 25,50.
2. **Given** o lojista informa SEDEX = R$ 28,00 e salva, **When** um cliente abre o checkout, **Then** o SEDEX aparece com R$ 28,00.
3. **Given** o lojista informa um valor negativo, vazio ou não numérico, **When** tenta salvar, **Then** o sistema recusa e mostra a mensagem de erro no campo.

---

### User Story 3 - Frete aparece no pedido para lojista e cliente (Priority: P3)

Depois de criado o pedido, a forma de entrega e o valor do frete aparecem nos detalhes do pedido no admin, na área "Minha conta" do cliente e no e-mail de confirmação, separados do subtotal dos produtos.

**Why this priority**: O lojista precisa saber como enviar cada pedido (PAC, SEDEX ou combinar). Isso depende da US1 já gravar o frete.

**Independent Test**: Criar um pedido com SEDEX e conferir "SEDEX — R$ 25,50" no detalhe do admin, em Minha conta e no e-mail.

**Acceptance Scenarios**:

1. **Given** um pedido criado com SEDEX, **When** o lojista abre o detalhe do pedido no admin, **Then** vê a forma de entrega "SEDEX", o frete R$ 25,50, o subtotal dos produtos e o total.
2. **Given** um pedido criado com "Combinar entrega com a loja", **When** o lojista vê o pedido, **Then** a forma de entrega está identificada como "Combinar com a loja" e o frete como "Grátis".
3. **Given** um pedido antigo, criado antes desta funcionalidade, **When** é exibido, **Then** aparece normalmente, sem linha de frete e sem erro.

---

### Edge Cases

- O lojista altera o valor do frete enquanto um cliente está com o checkout aberto: o pedido usa sempre o valor vigente no momento da criação. Se esse valor divergir do exibido ao cliente, o pedido não é criado e o checkout mostra o erro e o novo valor para o cliente confirmar. A cobrança nunca é diferente do valor que o cliente viu.
- Produto sem peso ou medidas de embalagem cadastrados: usa o valor fixo do serviço (hoje todos usam o valor fixo).
- Carrinho com vários produtos ou várias unidades: o frete é cobrado uma vez por pedido, não por item.
- Escolha de "Combinar com a loja": o endereço continua obrigatório, como contato e referência para a combinação.
- Valor de frete configurado como R$ 0,00 para PAC ou SEDEX: permitido, e o serviço aparece como "Grátis".
- Pedidos externos (Mercado Livre, Shopee, eventos, romaneios) não são afetados, porque o frete deles vem do próprio canal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O checkout DEVE apresentar três formas de entrega: PAC, SEDEX e Combinar entrega com a loja.
- **FR-002**: Cada forma de entrega DEVE exibir seu valor; a de combinar DEVE ser exibida como "Grátis", com aviso de que a loja entrará em contato.
- **FR-003**: O cliente DEVE escolher uma forma de entrega para finalizar o pedido; sem escolha, o pedido é recusado com mensagem clara.
- **FR-004**: O resumo do checkout DEVE mostrar subtotal dos produtos, frete e total (subtotal + frete), atualizando ao trocar a forma de entrega.
- **FR-005**: O valor do frete DEVE ser definido pela loja no momento da criação do pedido; valores enviados pelo navegador não são aceitos como fonte do preço.
- **FR-006**: Se o valor de frete exibido ao cliente divergir do valor vigente, o pedido NÃO DEVE ser criado e o cliente DEVE ver o erro e o valor atualizado.
- **FR-007**: O valor total cobrado no pagamento DEVE ser igual ao subtotal dos produtos mais o frete.
- **FR-008**: O frete DEVE ser cobrado uma vez por pedido, independentemente da quantidade de itens.
- **FR-009**: O pedido DEVE guardar a forma de entrega escolhida, o valor do frete cobrado e a origem do valor (fixo configurado ou calculado), preservados mesmo se a configuração mudar depois.
- **FR-010**: O admin DEVE permitir ver e editar os valores fixos de PAC e de SEDEX, com valores iniciais R$ 19,90 e R$ 25,50 quando nada foi configurado.
- **FR-011**: O admin DEVE recusar valores de frete vazios, negativos ou não numéricos, com mensagem de erro.
- **FR-012**: O cálculo do frete DEVE ser feito em um ponto único, preparado para receber um cálculo por CEP/peso no futuro: quando houver peso das embalagens e o cálculo for possível, usa o valor calculado; caso contrário, usa o valor fixo do serviço. Nesta entrega não há cálculo externo, então sempre vale o valor fixo.
- **FR-013**: A forma de entrega e o valor do frete DEVEM aparecer no detalhe do pedido no admin, na área Minha conta e no e-mail de confirmação do pedido.
- **FR-014**: Pedidos criados antes desta funcionalidade DEVEM continuar sendo exibidos sem erro, sem linha de frete.
- **FR-015**: Todos os novos textos visíveis DEVEM seguir o padrão de internacionalização já existente no site.
- **FR-016**: Erros na criação do pedido relacionados ao frete DEVEM ser retornados com status e mensagem visíveis, sem ser ocultados.

### Key Entities

- **Forma de entrega**: PAC, SEDEX ou Combinar com a loja. Tem nome exibido e indica se depende de valor configurado ou é gratuita.
- **Configuração de frete**: valores fixos do PAC e do SEDEX definidos pelo lojista, com valores iniciais R$ 19,90 e R$ 25,50.
- **Frete do pedido**: forma de entrega escolhida, valor cobrado e origem do valor (fixo ou calculado), gravados no pedido no momento da criação. O total do pedido passa a ser subtotal dos produtos + frete.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos pedidos do site criados após a entrega têm forma de entrega e frete registrados.
- **SC-002**: Em 100% dos pedidos, o valor cobrado no pagamento é igual ao total exibido ao cliente no checkout (subtotal + frete).
- **SC-003**: O cliente consegue escolher a forma de entrega e ver o total atualizado em uma única ação, sem recarregar a página.
- **SC-004**: O lojista altera o valor do PAC ou SEDEX em menos de 1 minuto, e o novo valor vale no próximo checkout aberto.
- **SC-005**: Nenhuma tentativa de alterar o valor do frete pelo navegador resulta em pedido com frete diferente do configurado.

## Assumptions

- Não há contrato com os Correios nem integração com API de frete nesta entrega; o cálculo por CEP/peso fica para uma tarefa futura.
- O endereço de entrega continua obrigatório em todas as formas de entrega, inclusive "Combinar com a loja".
- O prazo de entrega não é exibido, já que não há fonte confiável de prazo sem integração.
- O site não tem cupom de desconto no checkout hoje; o frete não sofre desconto.
- Pedidos externos (Mercado Livre, Shopee, eventos, romaneios de consignação) ficam fora do escopo.
- A configuração de frete fica junto das configurações já existentes do admin.
