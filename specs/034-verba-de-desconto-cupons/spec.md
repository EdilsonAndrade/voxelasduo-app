# Feature Specification: Verba de desconto (cupons e promoções)

**Feature Branch**: `034-verba-de-desconto-cupons`  
**Created**: 2026-10-22  
**Status**: Draft  
**Input**: User description: "Verba de desconto (cupons e promoções) por produto e na calculadora. Padronizar a tela de produto em margem % do preço (igual à calculadora), piso de lucro configurável (padrão 25%), cupom de loja global com os campos da Shopee (%, teto em R$, valor mínimo da cesta), bloco 'Verba de desconto' (verba = margem − piso; cupom de loja com teto; sobra livre para promoção relâmpago, cupom do produto etc.), simulador de desconto e sinalização dos produtos sem verba."

## Contexto

Hoje a tela de produto mede o lucro como **% sobre o custo** (markup), enquanto a calculadora mede como **% do preço de venda** (margem). Os dois usam a palavra "margem", o que gera confusão: "80% de margem mínima" no produto equivale a ~32% do preço, e "25%" na calculadora equivale a ~55% sobre o custo. O lojista segue a regra de mercado: **nunca trabalhar no piso de 25% do preço**, porque o que fica acima do piso é a **verba para cupons e promoções**. Da verba sai primeiro o cupom de loja (2–3%, vale para todos os produtos), e o restante fica livre para promoção relâmpago, cupom do produto, etc. Na Shopee os cupons de loja e de produto se somam.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a verba de desconto de um produto (Priority: P1)

Na tela do produto, para cada canal, o lojista vê a margem atual do produto (% do preço), o piso de lucro, a verba de desconto (margem − piso), quanto o cupom de loja consome e a **sobra livre** em % e R$, para saber até quanto pode dar de promoção sem cair abaixo do piso.

**Why this priority**: É a resposta direta à dúvida do lojista ("quanto posso dar de cupom e ainda ganhar 25%?") e o núcleo da funcionalidade.

**Independent Test**: Abrir um produto com preço Shopee definido e conferir que margem, verba, cupom de loja e sobra aparecem com os valores da regra (ex.: 42,9% − 25% = 17,9%; − 3% = 14,9%).

**Acceptance Scenarios**:

1. **Given** um produto na Shopee com margem atual de 42,9% do preço, piso de 25% e cupom de loja de 3% sem teto, **When** o lojista abre o produto, **Then** vê verba de 17,9%, cupom de loja de 3,0% e sobra de 14,9%, cada um também em R$ sobre o preço atual.
2. **Given** um cupom de loja de 3% com teto de R$ 5,00 e um produto de R$ 300,00, **When** o lojista abre o produto, **Then** o cupom de loja aparece como R$ 5,00 (1,7%) e a sobra é calculada com esse valor real.
3. **Given** um produto cuja margem atual é menor que piso + cupom de loja, **When** o lojista abre o produto, **Then** a sobra aparece como zero/negativa e um alerta diz que o produto não comporta nem o cupom de loja.

---

### User Story 2 - Margem padronizada em % do preço (Priority: P1)

Na tela de produto e no padrão global, "margem mínima" (piso) e "margem desejada" passam a ser **% do preço de venda**, a mesma régua da calculadora. O markup (% sobre o custo) aparece apenas como informação ao lado.

**Why this priority**: Sem a mesma régua, a verba de desconto do produto e da calculadora não batem e a confusão continua.

**Independent Test**: Definir margem desejada de 40% num produto e conferir que, ao preço sugerido para cada canal, o lucro é 40% do preço — o mesmo número que a calculadora mostra para esse preço.

**Acceptance Scenarios**:

1. **Given** um produto com custo R$ 59,57 e margem desejada de 40% do preço, **When** o preço sugerido da Shopee é calculado, **Then** o lucro nesse preço é 40% do preço e a calculadora, com o mesmo preço, mostra margem de 40%.
2. **Given** o lojista digitando uma margem desejada que, somada às taxas do canal, chegaria a 100% ou mais do preço, **When** salva, **Then** recebe uma mensagem explicando que a margem é impossível naquele canal.
3. **Given** qualquer margem exibida em % do preço, **When** o lojista olha o campo, **Then** vê ao lado o markup equivalente (% sobre o custo) como informação.

---

### User Story 3 - Configurar cupom de loja e piso de lucro (Priority: P1)

O lojista configura uma única vez o **cupom de loja** (% de desconto, teto em R$ opcional, valor mínimo da cesta) e o **piso de lucro padrão** (25% do preço), usados por todos os produtos e pela calculadora. O piso pode ser sobrescrito por produto.

**Why this priority**: Sem o cupom de loja configurado a sobra não pode ser calculada.

**Independent Test**: Configurar cupom de 3% com teto de R$ 5 e mínimo de R$ 10, salvar, recarregar e conferir os valores; abrir um produto e ver o cupom aplicado.

**Acceptance Scenarios**:

1. **Given** a tela de configuração de taxas, **When** o lojista informa cupom de loja 3%, teto R$ 5,00 e cesta mínima R$ 10,00 e salva, **Then** os valores persistem e passam a valer em todos os produtos e na calculadora.
2. **Given** o teto marcado como "sem limite", **When** a verba é calculada, **Then** o cupom de loja consome sempre o % cheio do preço.
3. **Given** cupom de loja com % zero ou não configurado, **When** a verba é calculada, **Then** a sobra é igual à verba inteira.

---

### User Story 4 - Simular um desconto (Priority: P2)

No bloco de verba (produto e calculadora), o lojista digita o desconto que pretende dar (ex.: promoção relâmpago de 10%) e vê na hora o preço final para o cliente, o lucro em R$ e em % do preço, e um alerta se o desconto passar da sobra.

**Why this priority**: Ajuda a decidir quanto da sobra usar, mas a sobra máxima (US1) já entrega o valor principal.

**Independent Test**: No produto de 42,9% com sobra de 14,9%, digitar 10% e conferir preço final, lucro e ausência de alerta; digitar 20% e conferir o alerta.

**Acceptance Scenarios**:

1. **Given** sobra de 14,9%, **When** o lojista simula 10% de desconto, **Then** vê preço final, lucro em R$ e % com o cupom de loja + 10% aplicados, sem alerta.
2. **Given** sobra de 14,9%, **When** o lojista simula 20%, **Then** vê um alerta de que o desconto passa da verba e o lucro fica abaixo do piso.
3. **Given** um desconto simulado, **When** os números são mostrados, **Then** o lucro considera a comissão do canal recalculada sobre o preço com desconto (lucro real), além da conta simples da verba.

---

### User Story 5 - Verba de desconto na calculadora (Priority: P2)

Na calculadora, o resumo mostra o mesmo bloco de verba de desconto (margem do preço calculado − piso, cupom de loja, sobra e simulador) para o canal selecionado.

**Why this priority**: A calculadora é onde o lojista forma o preço; ver a verba ali evita definir preços sem espaço para cupom.

**Independent Test**: Na calculadora com "Quero ganhar 25%", conferir que a verba aparece zerada e o alerta "sem espaço para cupom"; mudar para 40% e ver verba de 15%.

**Acceptance Scenarios**:

1. **Given** a calculadora no modo "margem mínima" com 25% e piso de 25%, **When** o resumo é exibido, **Then** a verba é 0% e há alerta de que não cabe nem o cupom de loja.
2. **Given** a calculadora no modo "preço alvo", **When** o lojista informa o preço, **Then** a verba é calculada sobre a margem resultante desse preço.

---

### User Story 6 - Sinalizar produtos sem verba (Priority: P3)

Na lista de produtos, os produtos cujo preço atual não comporta nem o cupom de loja (em algum canal com preço definido) aparecem sinalizados.

**Why this priority**: Facilita revisar o catálogo antes de criar um cupom de loja, mas é complementar.

**Independent Test**: Ter um produto com margem abaixo de piso + cupom de loja e conferir o sinal na lista; ajustar o preço e ver o sinal sumir.

**Acceptance Scenarios**:

1. **Given** um produto com margem Shopee de 26%, piso 25% e cupom de loja 3%, **When** o lojista abre a lista de produtos, **Then** o produto aparece sinalizado como "sem verba para cupom" na Shopee.
2. **Given** um produto sem custo configurado, **When** a lista é exibida, **Then** ele não é sinalizado.

### Edge Cases

- Produto sem preço definido no canal: o bloco de verba não é calculado para aquele canal e mostra que falta o preço.
- Custo do produto zero ou desconhecido: a margem e a verba não são exibidas, com aviso de que falta o custo.
- Margem atual abaixo do piso (verba negativa): verba e sobra aparecem como negativas/zeradas com alerta "abaixo do piso".
- Simulação com desconto de 0% ou maior/igual a 100%: 0% mostra a situação atual; ≥100% é rejeitado.
- Taxa fixa por faixa de preço (Shopee): no simulador, a taxa é recalculada para o preço com desconto, podendo mudar de faixa.
- Valor mínimo da cesta maior que o preço do produto: o cupom de loja continua sendo descontado (o cliente pode completar a cesta com outros itens).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A margem mínima (piso) e a margem desejada, tanto no padrão global quanto no override por produto, MUST ser expressas e calculadas como % do preço de venda (lucro ÷ preço), já descontados custo e taxas do canal.
- **FR-002**: O sistema MUST exibir, ao lado de cada margem em % do preço, o markup equivalente (% sobre o custo) apenas como informação.
- **FR-003**: O preço sugerido de cada canal MUST resultar em lucro igual à margem desejada em % do preço; margens que, somadas às taxas percentuais do canal, chegam a 100% ou mais MUST ser recusadas com mensagem clara.
- **FR-004**: Na mudança de régua, o padrão global MUST passar a piso 25% / desejada 40% do preço e os overrides de margem dos produtos MUST ser removidos (voltam a usar o padrão). Os valores antigos (em % sobre o custo) MUST ser guardados e o sistema MUST exibir uma lista "margens para revisar" com cada produto que tinha override, mostrando o valor antigo e um equivalente sugerido em % do preço (pelo preço atual de cada canal), com atalho para abrir o produto. O lojista pode marcar cada item como revisado, removendo-o da lista.
- **FR-005**: O piso de lucro padrão MUST ser 25% do preço para novas configurações, editável no padrão global e sobrescrevível por produto.
- **FR-006**: O lojista MUST poder configurar um cupom de loja global com: % de desconto, teto em R$ (opcional, "sem limite") e valor mínimo da cesta (informativo, não entra no cálculo).
- **FR-007**: Para cada canal com preço definido, o sistema MUST calcular: margem atual (% do preço), verba = margem atual − piso, cupom de loja real = min(% × preço, teto) em R$ e em % do preço, e sobra = verba − cupom de loja real, em % e em R$.
- **FR-008**: O cupom de loja MUST ser aplicado apenas ao canal Shopee; nos demais canais a sobra é igual à verba.
- **FR-009**: Quando a sobra for menor ou igual a zero, o sistema MUST exibir alerta de que o produto não comporta o cupom de loja (ou está abaixo do piso, quando a verba for negativa).
- **FR-010**: O sistema MUST oferecer um simulador em que o lojista informa um desconto em % e vê: preço final para o cliente (com cupom de loja + desconto somados), lucro em R$ e em % do preço final, com taxas do canal recalculadas sobre o preço com desconto.
- **FR-011**: O simulador MUST alertar quando o desconto informado ultrapassar a sobra.
- **FR-012**: A calculadora MUST exibir o mesmo bloco de verba e simulador para o canal selecionado, usando o piso e o cupom de loja globais.
- **FR-013**: A lista de produtos MUST sinalizar produtos que, no preço Shopee salvo (canal onde vale o cupom de loja), não comportam o cupom de loja ou estão abaixo do piso.
- **FR-014**: Os limites de promoção já existentes (desconto máximo aceito em promoções do Mercado Livre e da Shopee) MUST passar a usar o piso em % do preço.
- **FR-015**: Todos os textos novos ou alterados MUST seguir o padrão de internacionalização existente.

### Key Entities

- **Configuração de taxas (global)**: passa a ter piso de lucro (% do preço), margem desejada (% do preço) e cupom de loja (% desconto, teto em R$ opcional, valor mínimo da cesta).
- **Produto**: overrides opcionais de piso e margem desejada, agora em % do preço.
- **Verba de desconto (calculada, não salva)**: por produto e canal — margem atual, piso, verba, cupom de loja real, sobra, em % e R$.
- **Simulação de desconto (não salva)**: desconto informado, preço final, lucro em R$ e %, alerta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para o mesmo produto, canal e preço, a margem mostrada na tela de produto e na calculadora é idêntica (diferença zero em 100% dos casos testados).
- **SC-002**: O lojista descobre o desconto máximo que pode dar num produto em menos de 10 segundos, sem usar calculadora externa.
- **SC-003**: Em 100% dos descontos simulados dentro da sobra, o lucro real resultante fica igual ou acima do piso.
- **SC-004**: Todos os produtos sem espaço para o cupom de loja ficam identificáveis na lista de produtos sem abrir cada um.

## Assumptions

- A régua oficial do sistema passa a ser "margem = lucro ÷ preço de venda", como no curso seguido pelo lojista.
- A verba usa a subtração simples (margem − piso − cupom), que é conservadora: garante o piso tanto sobre o preço com desconto quanto sobre o preço cheio. O simulador mostra o lucro real para o lojista enxergar a folga.
- Na Shopee, cupom de loja e descontos do produto se somam (informado pelo lojista).
- O cupom de loja é uma configuração única da loja Shopee; não há cupons de loja configurados para Mercado Livre nem site próprio nesta versão.
- O valor mínimo da cesta é apenas registrado/exibido: por segurança, o cupom de loja é sempre descontado.
- Não há integração para criar cupons ou promoções na Shopee; o sistema apenas calcula e informa.
- A margem desejada padrão para novas configurações será 40% do preço (equivale a deixar ~15% de verba acima do piso de 25%).
