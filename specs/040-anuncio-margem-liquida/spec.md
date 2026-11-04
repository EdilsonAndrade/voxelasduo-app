# Feature Specification: Anúncio pago opcional e margem líquida sobre o preço

**Feature Branch**: `edilsonaandrade/edi-137-toggle-de-anuncio-pago-roas-e-margem-liquida-de-25-sobre-o`
**Linear**: EDI-137
**Created**: 2026-11-04
**Status**: Draft
**Input**: User description: "Toggle de anúncio pago (ROAS) e margem líquida de 25% sobre o preço na calculadora, produto e Tempo de Impressão. Meta mínima do curso: 25% de margem líquida por produto, depois de filamento, energia, embalagem, falha, taxas do marketplace e anúncios."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Margem líquida no Tempo de Impressão (Priority: P1)

O vendedor cadastra um item no Tempo de Impressão (tempo, peso, quantidade por placa) e digita a margem desejada. Hoje essa margem é aplicada sobre o custo da peça, então "25%" deixa só ~13% do preço como lucro. O vendedor quer que a margem signifique o mesmo que na calculadora de preço: a fatia do preço de venda que sobra depois de todos os custos e taxas.

**Why this priority**: É o que hoje engana a análise de viabilidade: o preço sugerido parece bom, mas fica abaixo da meta de 25% líquidos do curso.

**Independent Test**: Cadastrar um item com custo conhecido e margem 25% e conferir que o lucro mostrado na Shopee e na venda direta é 25% do preço sugerido.

**Acceptance Scenarios**:

1. **Given** um item com custo por peça de R$ 58,46 e margem 25%, **When** o vendedor vê o preço da Shopee, **Then** o preço é ~R$ 128,63 e o lucro ~R$ 32,16 (25% do preço).
2. **Given** o mesmo item, **When** o vendedor muda a margem para 30%, **Then** o preço e o lucro são recalculados com 30% do preço como lucro.
3. **Given** um item sem margem digitada, **When** o vendedor abre o item, **Then** a margem considerada é 25% (meta mínima).
4. **Given** um item com margem abaixo de 25%, **When** o vendedor vê o resultado, **Then** o cálculo usa a margem digitada e mostra um aviso de que está abaixo da meta mínima de 25%.
5. **Given** um conjunto de várias partes, **When** o vendedor vê o ganho do conjunto, **Then** a margem do conjunto também é líquida sobre o preço do conjunto.

---

### User Story 2 - Anúncio pago opcional no Tempo de Impressão (Priority: P2)

O vendedor liga "Anúncio pago" num item do Tempo de Impressão e informa o ROAS meta. O preço sugerido passa a reservar a parte do anúncio e ainda entregar a margem pedida. Desligado, nada de anúncio entra na conta.

**Why this priority**: O curso lista anúncios como custo obrigatório quando há campanha; sem isso o produto parece viável e não é.

**Independent Test**: No mesmo item, comparar o preço com o toggle desligado e ligado com ROAS 8.

**Acceptance Scenarios**:

1. **Given** um item com "Anúncio pago" desligado, **When** o vendedor vê o preço, **Then** nenhum custo de anúncio é descontado.
2. **Given** "Anúncio pago" ligado com ROAS 8, **When** o vendedor vê o preço, **Then** 12,5% do preço é reservado para anúncio, aparece no detalhamento, e o lucro continua igual à margem pedida.
3. **Given** "Anúncio pago" ligado sem ROAS válido (vazio, zero ou negativo), **When** o vendedor vê o resultado, **Then** o sistema avisa que o ROAS é obrigatório e não mostra preço com anúncio.
4. **Given** o vendedor ligou o anúncio e salvou o item, **When** reabre a tela, **Then** o toggle e o ROAS continuam como foram salvos.

---

### User Story 3 - Anúncio pago opcional no produto (Priority: P2)

Na área de produtos, junto da margem do produto, o vendedor liga "Anúncio pago" e informa o ROAS meta. Os preços sugeridos e o lucro por canal passam a descontar o anúncio. Desligado, continuam como hoje.

**Why this priority**: O produto é onde o preço final de venda é definido; precisa refletir o custo real quando o produto é anunciado.

**Independent Test**: Abrir um produto com custo conhecido, ligar o toggle com ROAS 8 e conferir preço e lucro por canal.

**Acceptance Scenarios**:

1. **Given** um produto existente, **When** o vendedor abre o produto, **Then** "Anúncio pago" vem desligado e os preços são os mesmos de antes desta mudança.
2. **Given** "Anúncio pago" ligado com ROAS 8, **When** o vendedor vê os preços sugeridos, **Then** Shopee e Mercado Livre reservam 12,5% do preço para anúncio e o lucro mostrado já está líquido do anúncio; o site próprio não muda.
3. **Given** o vendedor ligou o anúncio e salvou o produto, **When** reabre o produto, **Then** o toggle e o ROAS continuam salvos.

---

### User Story 4 - Anúncio pago na calculadora como toggle (Priority: P3)

Na calculadora de preço, o controle de anúncio já existe (sem anúncio / embutido no preço / do bolso). O vendedor quer o mesmo jeito de usar das outras telas: um toggle "Anúncio pago" que, ligado, pede o ROAS meta.

**Why this priority**: A calculadora já desconta o anúncio quando escolhido; a mudança é de consistência entre as telas.

**Independent Test**: Abrir a calculadora, conferir o toggle desligado por padrão, ligar com ROAS 8 e ver o anúncio descontado.

**Acceptance Scenarios**:

1. **Given** um cálculo novo, **When** o vendedor abre a calculadora, **Then** "Anúncio pago" vem desligado.
2. **Given** o toggle ligado com ROAS 8, **When** o vendedor vê o resumo, **Then** o anúncio embutido aparece no detalhamento e o lucro bate a margem pedida.
3. **Given** um cálculo salvo antes desta mudança com anúncio "embutido" ou "do bolso", **When** o vendedor o reabre, **Then** o cálculo abre com o mesmo resultado de antes.

---

### Edge Cases

- ROAS muito baixo faz taxa + anúncio + imposto + margem passarem de 100% do preço: o sistema avisa que não existe preço possível, sem esconder o erro.
- O preço com anúncio muda de faixa da Shopee (ex.: passa de R$ 79,99): a taxa da nova faixa é aplicada, como já acontece hoje.
- Margem vazia no Tempo de Impressão: usa 25%.
- Itens do Tempo de Impressão salvos antes da mudança: a margem gravada passa a ser lida como margem sobre o preço, então o preço sugerido sobe.
- Conjunto com partes de margens diferentes: a margem do conjunto é líquida sobre o preço do conjunto (média ponderada pelo custo de cada parte).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O Tempo de Impressão MUST calcular o preço de cada canal de forma que o lucro (preço − custo − taxas − imposto − anúncio) seja igual à margem digitada × preço.
- **FR-002**: O Tempo de Impressão MUST usar 25% quando a margem estiver vazia e MUST aceitar qualquer margem maior digitada.
- **FR-003**: O Tempo de Impressão MUST mostrar um aviso quando a margem digitada estiver abaixo de 25%, sem bloquear o cálculo.
- **FR-004**: Tempo de Impressão, área de produto e calculadora MUST oferecer um toggle "Anúncio pago", desligado por padrão.
- **FR-005**: Com o toggle ligado, o sistema MUST pedir o ROAS meta e reservar preço ÷ ROAS para anúncio, antes de aplicar a margem.
- **FR-006**: Com o toggle desligado, o sistema MUST NOT descontar nenhum custo de anúncio.
- **FR-007**: O sistema MUST mostrar o custo do anúncio como linha própria no detalhamento das taxas quando o toggle estiver ligado.
- **FR-008**: O toggle e o ROAS MUST ser salvos junto com o item do Tempo de Impressão e com o produto.
- **FR-009**: O sistema MUST avisar quando o ROAS for inválido (vazio, zero ou negativo) com o toggle ligado.
- **FR-010**: O sistema MUST avisar quando taxas + anúncio + imposto + margem impedirem qualquer preço.
- **FR-011**: Produtos e cálculos salvos antes desta mudança MUST abrir com o mesmo resultado de antes (toggle desligado nos produtos; modo de anúncio preservado nos cálculos da calculadora).
- **FR-012**: Todos os textos novos MUST seguir o padrão de I18N do projeto.

### Key Entities

- **Anúncio pago**: ligado/desligado + ROAS meta. Pertence a um item do Tempo de Impressão, a um produto ou a um cálculo da calculadora.
- **Margem líquida**: percentual do preço de venda que sobra como lucro depois de custo, taxas, imposto e anúncio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos itens do Tempo de Impressão, lucro ÷ preço mostrado é igual à margem digitada (diferença máxima de 0,1 ponto percentual por arredondamento).
- **SC-002**: Com custo R$ 58,46 e margem 25% na Shopee, o Tempo de Impressão e a calculadora mostram o mesmo preço (~R$ 128,63).
- **SC-003**: Com o toggle desligado, 100% dos produtos existentes mostram os mesmos preços de antes.
- **SC-004**: Com ROAS 8, o anúncio mostrado é 12,5% do preço em todas as três telas.
- **SC-005**: O vendedor consegue ligar o anúncio e ver o novo preço em menos de 10 segundos em qualquer das três telas.

## Assumptions

- "Mínimo 25%" é a meta: abaixo disso o sistema avisa, mas não bloqueia (mesmo comportamento de alerta de margem baixa já usado no produto).
- O ROAS segue o padrão já usado na calculadora (custo do anúncio = preço ÷ ROAS) e o valor sugerido ao ligar é 8.
- Na calculadora, o modo "do bolso" (verba fixa fora do preço) continua disponível como opção dentro do toggle ligado; não é removido.
- No Tempo de Impressão os canais continuam Shopee e venda direta; Mercado Livre fica fora.
- Imposto, embalagem, energia, falha e desgaste continuam vindo dos padrões já existentes; esta mudança não altera esses valores.
- O anúncio vale só para os marketplaces (Shopee e Mercado Livre), como a calculadora já faz. Site próprio e venda direta ficam sem anúncio.
