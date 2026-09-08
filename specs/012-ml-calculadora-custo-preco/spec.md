# Feature Specification: Calculadora de custo e preço sugerido (Mercado Livre)

**Feature Branch**: `edilsonaandrade/edi-92-mercado-livre-calculadora-de-custo-e-preco-sugerido-no`
**Created**: 2026-09-08
**Status**: Draft
**Input**: User description: "Mercado Livre: calculadora de custo e preço sugerido no cadastro/edição de produto (EDI-92) — Ao cadastrar ou editar um produto na área administrativa do Voxelas Duo, o usuário precisa visualizar, em tempo real, o custo de produção estimado (COGS) da peça impressa em 3D, a comissão real de venda no Mercado Livre (via API oficial) e uma simulação de precificação (lucro líquido e margem) conforme digita o preço de venda desejado. Custos de produção configuráveis por produto. Fora de escopo: preços por quantidade, preços líquidos, referências de preços por concorrência, automações de preços e Shopee (EDI-93)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar custos de produção do produto (Priority: P1)

Ao cadastrar ou editar um produto, o vendedor informa os dados de produção da peça (peso, tempo de impressão, tempo de mão de obra, custo do filamento, margem de perda, dados da impressora usada, consumo elétrico/tarifa, valor da hora de trabalho e custo de embalagem) e vê imediatamente o custo total de produção (COGS) calculado.

**Why this priority**: Sem o custo de produção corretamente calculado, nenhuma simulação de preço posterior tem valor. É a base de todo o restante da funcionalidade.

**Independent Test**: Pode ser testado isoladamente preenchendo os campos de custo de produção de um produto (novo ou existente) e conferindo que o valor de COGS exibido bate com o cálculo manual esperado, mesmo sem preencher preço de venda ou consultar o Mercado Livre.

**Acceptance Scenarios**:

1. **Given** um produto novo sem custos preenchidos, **When** o vendedor informa peso da peça, tempo de impressão, preço/peso do carretel de filamento, margem de perda, preço/vida útil da impressora, consumo elétrico/tarifa, valor da hora de trabalho e custo de embalagem, **Then** o sistema exibe o custo total de produção (COGS) calculado e o detalhamento por componente (filamento, energia, depreciação, mão de obra, embalagem).
2. **Given** um produto já cadastrado com custos de produção preenchidos, **When** o vendedor edita o produto e altera qualquer um dos campos de custo, **Then** o COGS exibido é recalculado imediatamente refletindo o novo valor.
3. **Given** um produto sem todos os campos de custo preenchidos, **When** o vendedor visualiza a tela, **Then** o sistema indica quais campos estão faltando e não exibe um COGS calculado incompleto/enganoso.

---

### User Story 2 - Ver a comissão real do Mercado Livre para o preço digitado (Priority: P1)

Ao digitar ou ajustar o preço de venda desejado no cadastro/edição do produto, o vendedor vê a comissão real de venda no Mercado Livre para aquele preço e categoria (não uma porcentagem fixa assumida), incluindo taxa de anúncio e taxa de venda.

**Why this priority**: É o principal problema relatado — hoje não há visibilidade de quanto o Mercado Livre efetivamente cobra, e essa taxa varia por categoria e tipo de anúncio, tornando arriscado assumir um percentual fixo.

**Independent Test**: Pode ser testado digitando um preço de venda em um produto com categoria do Mercado Livre já definida e conferindo que o valor de comissão exibido corresponde ao retornado pela API oficial de custos de venda do Mercado Livre para aquele preço/categoria.

**Acceptance Scenarios**:

1. **Given** um produto com categoria do Mercado Livre definida, **When** o vendedor digita um preço de venda, **Then** o sistema consulta a comissão real para aquele preço/categoria e exibe o valor da taxa de anúncio, o valor e o percentual da comissão de venda.
2. **Given** um preço de venda já digitado, **When** o vendedor altera o valor, **Then** a comissão exibida é atualizada automaticamente após uma pequena pausa na digitação (sem exigir ação explícita de "consultar").
3. **Given** uma falha ao consultar a comissão (ex: categoria inválida, erro de comunicação com o Mercado Livre), **When** isso ocorre, **Then** o sistema exibe um aviso claro do problema e permite que o vendedor continue preenchendo/salvando o produto normalmente, sem a simulação de comissão.
4. **Given** o vendedor discorda do valor de comissão retornado ou quer simular outro cenário, **When** ele edita manualmente o campo de comissão exibido, **Then** a simulação de precificação passa a usar o valor informado manualmente até que ele volte a alterar o preço (o que aciona nova consulta automática).

---

### User Story 3 - Ver lucro líquido e margem ao digitar o preço de venda (Priority: P1)

Com o custo de produção (User Story 1) e a comissão do Mercado Livre (User Story 2) disponíveis, o vendedor vê, ao digitar o preço de venda desejado, o lucro líquido estimado por peça e a margem de lucro resultante, com um alerta visual caso o preço configure prejuízo ou margem abaixo do mínimo aceitável.

**Why this priority**: É o resultado final que resolve a dor do usuário — saber se o preço que pretende praticar realmente compensa, evitando vender no prejuízo sem perceber.

**Independent Test**: Pode ser testado preenchendo custo de produção e comissão (real ou manual) e digitando diferentes preços de venda, conferindo que o lucro líquido, a margem e o alerta de prejuízo/margem baixa aparecem corretamente para cada cenário.

**Acceptance Scenarios**:

1. **Given** custo de produção e comissão do Mercado Livre disponíveis para o preço digitado, **When** o vendedor visualiza a simulação, **Then** o sistema exibe: custo total de produção, comissão do Mercado Livre, lucro líquido por peça e margem de lucro (%).
2. **Given** um preço de venda digitado que resulta em lucro líquido negativo, **When** o vendedor visualiza a simulação, **Then** o sistema destaca visualmente que o preço configura prejuízo.
3. **Given** um preço de venda digitado que resulta em margem de lucro abaixo de um limite mínimo configurável, **When** o vendedor visualiza a simulação, **Then** o sistema exibe um alerta visual de margem baixa (distinto do alerta de prejuízo).
4. **Given** o custo de produção ainda não está completo (User Story 1) ou a comissão ainda não foi obtida/informada (User Story 2), **When** o vendedor tenta ver a simulação, **Then** o sistema indica claramente o que falta preencher em vez de mostrar um resultado incompleto ou incorreto.

---

### Edge Cases

- O que acontece quando o produto ainda não tem uma categoria do Mercado Livre associada? A simulação de comissão deve ficar indisponível com uma mensagem explicando o motivo, sem bloquear o restante do cadastro.
- Como o sistema se comporta se o vendedor digitar um preço de venda igual a zero ou negativo? Deve ser tratado como entrada inválida, sem disparar consulta de comissão nem calcular margem.
- O que acontece se a consulta de comissão demorar mais que o esperado (lentidão da API externa)? O sistema deve indicar visualmente que está calculando, sem travar o restante do formulário.
- Como o sistema lida com produtos que possuem variações com preços diferentes? Cada variação com preço próprio deve ter sua própria simulação (custo e comissão podem diferir por variação, quando aplicável).
- O que acontece se o vendedor alterar o tipo de anúncio (ex: clássico/premium) do produto? A comissão deve ser recalculada, pois a taxa depende do tipo de anúncio escolhido.
- O que acontece se os dados de custo de produção resultarem em COGS igual a zero (ex: todos os campos zerados)? O sistema deve tratar isso como custo não preenchido, não como custo real de zero, evitando simular margens irrealisticamente altas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir informar, por produto, os dados de custo de produção: peso da peça (gramas), tempo de impressão (horas), tempo de mão de obra/acabamento (horas), preço do carretel de filamento, peso do carretel, margem de perda/purga (%), preço da impressora, vida útil estimada da impressora (horas), consumo elétrico médio (kW/h), tarifa de energia (R$/kWh), valor da hora de trabalho e custo de embalagem/envio por unidade.
- **FR-002**: O sistema MUST calcular e exibir o custo total de produção (COGS) do produto a partir dos dados informados, com o detalhamento por componente de custo (filamento, energia, depreciação de máquina, mão de obra, embalagem).
- **FR-003**: O sistema MUST recalcular o COGS automaticamente sempre que qualquer campo de custo de produção for alterado.
- **FR-004**: O sistema MUST consultar a comissão real de venda do Mercado Livre (taxa de anúncio e taxa de venda) para o preço de venda digitado e a categoria/tipo de anúncio do produto, usando a API oficial de custos de venda do Mercado Livre.
- **FR-005**: O sistema MUST atualizar a consulta de comissão automaticamente conforme o vendedor ajusta o preço de venda, sem exigir uma ação explícita de "consultar", aguardando uma pequena pausa na digitação antes de consultar.
- **FR-006**: O sistema MUST exibir um aviso compreensível e não bloqueante quando a consulta de comissão falhar (ex: categoria inválida, produto sem categoria associada, indisponibilidade da API), permitindo que o cadastro/edição do produto prossiga normalmente.
- **FR-007**: O sistema MUST permitir que o vendedor sobrescreva manualmente o valor de comissão exibido, usando esse valor manual na simulação de precificação até que uma nova consulta automática seja disparada (ex: por alteração do preço).
- **FR-008**: O sistema MUST calcular e exibir, para o preço de venda digitado: custo total de produção, comissão do Mercado Livre (real ou manual), lucro líquido estimado por peça e margem de lucro (%).
- **FR-009**: O sistema MUST exibir um alerta visual distinto quando o preço digitado resultar em prejuízo (lucro líquido negativo).
- **FR-010**: O sistema MUST exibir um alerta visual distinto quando o preço digitado resultar em margem de lucro abaixo de um limite mínimo configurável.
- **FR-011**: O sistema MUST indicar claramente quando a simulação de precificação não pode ser exibida por falta de dados (custo de produção incompleto, categoria do Mercado Livre ausente, ou comissão ainda não obtida).
- **FR-012**: O sistema MUST tratar entradas de preço de venda inválidas (zero, negativo ou não numéricas) sem disparar consulta de comissão e sem calcular lucro/margem para essas entradas.
- **FR-013**: O sistema MUST NOT considerar como escopo desta funcionalidade: preços por quantidade (B2B/B2C), preços líquidos, referências de preços por concorrência e automações de preços do Mercado Livre.
- **FR-014**: O sistema MUST NOT exibir ou calcular simulações para a Shopee nesta funcionalidade (tratado em ticket separado, EDI-93).

### Key Entities *(include if feature involves data)*

- **Custo de Produção do Produto**: Conjunto de dados de custo associado a um produto específico (peso da peça, tempo de impressão, tempo de mão de obra, dados de filamento, margem de perda, dados da impressora usada, consumo/tarifa de energia, valor da hora de trabalho, custo de embalagem) usado para calcular o COGS. Pertence a um único produto (não compartilhado entre produtos).
- **Simulação de Precificação**: Resultado calculado a partir do Custo de Produção, do preço de venda digitado e da Comissão do Mercado Livre (real ou manual) para aquele preço — contém COGS total, comissão aplicada, lucro líquido e margem de lucro.
- **Comissão do Mercado Livre**: Dado obtido da API oficial de custos de venda do Mercado Livre (ou informado manualmente pelo vendedor) para uma combinação de preço, categoria e tipo de anúncio — contém taxa de anúncio e taxa de venda (valor e percentual).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ao digitar um preço de venda no cadastro/edição de um produto com custos e categoria já preenchidos, o vendedor vê o lucro líquido e a margem estimados em até 2 segundos após parar de digitar.
- **SC-002**: 100% dos preços de venda que resultariam em prejuízo são sinalizados visualmente antes de o vendedor salvar/publicar o produto.
- **SC-003**: O vendedor consegue configurar os custos de produção completos de um produto e visualizar o COGS calculado sem precisar de planilhas ou cálculos externos.
- **SC-004**: Quando a consulta de comissão ao Mercado Livre falha, o vendedor ainda consegue concluir o cadastro/edição do produto sem erros bloqueantes, em 100% dos casos.
- **SC-005**: A comissão exibida para um produto reflete o valor real informado pelo Mercado Livre para aquele preço/categoria/tipo de anúncio, e não um percentual fixo assumido internamente.

## Assumptions

- O produto já possui (ou terá, via este ou outro trabalho) uma categoria do Mercado Livre associada e um tipo de anúncio/logística configurados, necessários para consultar a comissão real; sem esses dados, a simulação de comissão fica indisponível.
- A integração com o Mercado Livre já possui autenticação (token de acesso) configurada e reutilizável para chamadas de leitura de custos de venda, conforme integração existente do projeto.
- "Tempo real"/"conforme digita" é interpretado como atualização automática após uma pequena pausa na digitação (debounce), e não uma consulta a cada tecla pressionada.
- O limite mínimo de margem de lucro usado para o alerta visual (FR-010) é configurável pelo usuário/administração, sem um valor de negócio único imposto por esta especificação.
- Custos de produção são específicos por produto (cada produto guarda seus próprios valores de impressora, filamento, tarifas etc.), conforme confirmado com o solicitante — não há uma configuração global compartilhada nesta fase.
- Simulação de precificação para produtos com variações (ex: cores, tamanhos com preços diferentes) é tratada por variação, cada uma com seu próprio preço e, potencialmente, seus próprios custos.
- Fora de escopo desta funcionalidade: preços por quantidade B2B/B2C, preços líquidos, referências de preços por concorrência, automações de preços do Mercado Livre, e qualquer cálculo equivalente para a Shopee (tratado no ticket EDI-93, bloqueado).
