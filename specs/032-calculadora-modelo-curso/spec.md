# Feature Specification: Calculadora de preço no modelo do curso

**Feature Branch**: `main` (sem branch nova, a pedido do usuário)
**Created**: 2026-10-15
**Status**: Draft
**Input**: User description: "Reformular a calculadora de preço do admin usando como modelo a calculadora de um curso, mantendo as funcionalidades nossas que o modelo não tem (Ads, concorrente, kits, produção do mês, salvar/duplicar/imprimir/virar produto)."

## Contexto

A calculadora atual (/admin/produtos/calculadora) é forte em estratégia de venda (Ads, concorrente, kits, produção), mas a entrada de dados é limitada (um filamento só, embalagem num campo só, sem imposto, sem taxa de pagamento na venda direta, sem "preço alvo") e o resultado é uma coluna longa e difícil de ler. O modelo do curso organiza a tela em seções recolhíveis e apresenta um resumo claro (custo, margem de contribuição, markup, composição do custo, taxas do canal, potencial diário e mensal).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Montar o custo da peça com mais precisão (Priority: P1)

O sócio abre a calculadora, carrega o G-code fatiado (ou digita tempo e peso), informa os filamentos usados (um ou vários, com cor e preço por kg), a taxa de falha e os custos extras (caixa, plástico bolha, etiqueta, mão de obra) e vê o custo por unidade e de onde ele vem.

**Why this priority**: Todo preço depende do custo. Sem custo certo, nenhuma outra parte da calculadora vale.

**Independent Test**: Preencher só a seção de Impressão e Custos extras e conferir que o custo por unidade e as barras de composição batem com a conta manual.

**Acceptance Scenarios**:

1. **Given** um G-code do Bambu Studio, **When** o usuário o carrega, **Then** o tempo de impressão (horas e minutos) e o peso de cada filamento são preenchidos, e o arquivo não é enviado a nenhum servidor.
2. **Given** um arquivo que não é G-code válido ou não traz tempo/peso, **When** o usuário o carrega, **Then** uma mensagem de erro clara aparece e os campos não mudam.
3. **Given** a lista de filamentos vazia, **When** o usuário digita peso e R$/kg no campo simples, **Then** o material é calculado pelo campo simples.
4. **Given** a lista de filamentos com dois itens, **When** o custo é calculado, **Then** vale a soma da lista e o campo simples fica desativado.
5. **Given** a lista de custos extras com itens, **When** o custo é calculado, **Then** vale a lista e o campo simples de embalagem fica desativado; sem itens na lista, vale o campo simples.
6. **Given** um modelo de impressora escolhido, **When** o consumo ainda não foi editado, **Then** o consumo de referência (kWh/h) daquela impressora é sugerido e pode ser alterado.
7. **Given** taxa de falha de 2%, **When** o custo é calculado, **Then** aparece uma linha "Reserva de falha" equivalente a 2% do custo de impressão (material + energia + desgaste).

---

### User Story 2 - Precificar por margem mínima ou por preço alvo (Priority: P1)

O sócio escolhe como quer precificar: "Margem mínima" (diz quanto quer ganhar e recebe o preço) ou "Preço alvo" (diz por quanto quer ou consegue vender — geralmente o preço do concorrente — e vê quanto ganha). Informa o imposto (padrão 0%, vende no CPF) e, se quiser, um desconto de promoção.

**Why this priority**: É a decisão principal da tela; o modo "preço alvo" responde direto "se eu vender por X, quanto sobra?".

**Independent Test**: Com custo preenchido, alternar entre os modos e conferir preço, margem de contribuição (R$ e %), markup e lucro no resumo.

**Acceptance Scenarios**:

1. **Given** modo Margem mínima com 25%, **When** o custo muda, **Then** o preço sugerido de cada canal é recalculado ao vivo para manter 25% do preço como lucro, depois de taxa, imposto e anúncio embutido.
2. **Given** modo Preço alvo com R$ 16,28 na Shopee e custo de R$ 5,45, **When** o resumo é exibido, **Then** mostra as taxas do canal, a margem de contribuição em R$ e em %, e o markup (preço ÷ custo).
3. **Given** modo Preço alvo e um preço de concorrente informado, **When** o usuário clica em "usar preço do concorrente", **Then** o preço alvo é preenchido com o preço do concorrente.
4. **Given** um preço alvo abaixo do custo + taxas, **When** o resumo é exibido, **Then** a margem aparece negativa e destacada como prejuízo.
5. **Given** imposto de 6%, **When** o preço é calculado, **Then** 6% do preço de venda entra como dedução antes do lucro.
6. **Given** promoção de 10% ligada, **When** o resultado é exibido, **Then** o lucro é calculado sobre o preço com desconto e o preço cheio (antes do desconto) também aparece.

---

### User Story 3 - Ver o resultado por canal em abas (Priority: P1)

No resumo, o sócio alterna entre as abas Venda direta, Shopee e Mercado Livre, e vê para cada uma: preço para o consumidor, custo por unidade, margem de contribuição, markup, total de taxas do canal com detalhamento, composição do custo em barras e potencial diário e mensal. Uma linha compacta compara os três canais lado a lado.

**Why this priority**: Substitui a coluna longa atual, que é o principal problema de leitura.

**Independent Test**: Preencher o custo e conferir que cada aba mostra os números do seu canal e que a linha comparativa bate com as abas.

**Acceptance Scenarios**:

1. **Given** o resultado calculado, **When** o usuário troca de aba, **Then** os números mudam para o canal escolhido, sem perder o que foi digitado.
2. **Given** a aba Shopee, **When** o preço cai na faixa até R$ 79,99, **Then** o card de taxas mostra "Comissão 20% (R$ x) + taxa fixa R$ 4,50" e o total.
3. **Given** 13,3 peças por dia de produção, **When** o resumo é exibido, **Then** o potencial diário e mensal mostra o lucro esperado com a base usada (peças, ciclos, horas por dia, dias no mês).

---

### User Story 4 - Configurar o canal de venda (Priority: P2)

Para Venda direta, o sócio escolhe a forma de pagamento (Débito 1,99%, Crédito 2,99%, Pix com taxa editável, Outra digitada) e se o frete é grátis (absorve um custo de envio informado) ou cobrado. Para a Shopee, escolhe CNPJ ou CPF; no CPF, escolhe o volume de pedidos em 90 dias (até 450 ou mais de 450 = + R$ 3,00 por item), vê a tabela de comissão por faixa e pode ligar Campanha de destaque (comissão extra em %) e Cupom próprio (desconto absorvido como custo). Para o Mercado Livre, informa comissão e custo fixo abaixo de R$ 79, como hoje.

**Why this priority**: Deixa as taxas fiéis a cada canal; hoje a venda direta ignora a taxa da maquininha e o frete.

**Independent Test**: Trocar a forma de pagamento e o frete na Venda direta e as opções da Shopee, e conferir o card de taxas e o lucro.

**Acceptance Scenarios**:

1. **Given** Venda direta com Crédito, **When** o resultado é exibido, **Then** 2,99% do preço entra como taxa de pagamento.
2. **Given** Venda direta com frete grátis e custo de envio R$ 15,00, **When** o resultado é exibido, **Then** os R$ 15,00 entram como custo da venda; com frete cobrado, não entram.
3. **Given** Shopee com conta CPF e mais de 450 pedidos, **When** o resultado é exibido, **Then** R$ 3,00 por item entram nas taxas; com CNPJ ou até 450 pedidos, não entram.
4. **Given** Shopee com Campanha de destaque de 3%, **When** o resultado é exibido, **Then** 3% a mais de comissão entram nas taxas.
5. **Given** Shopee com cupom próprio de R$ 2,00, **When** o resultado é exibido, **Then** os R$ 2,00 entram como custo da venda.
6. **Given** a tabela de faixas da Shopee, **When** exibida, **Then** mostra comissão, taxa fixa, subsídio de frete e subsídio Pix de cada faixa, com aviso de que os subsídios são informativos e não entram no cálculo.

---

### User Story 5 - Manter as funções de estratégia que já existem (Priority: P2)

Tudo o que a calculadora já faz continua: Ads (sem anúncio / embutido no preço / do bolso, meta de ROAS, o que digitar na campanha, tabela de ROAS, semáforo, ACOS no Mercado Livre), Concorrente (preço normal, oferta relâmpago, vendas no mês, comparativo e margem para igualar, custo máximo, kit que bate), Produção no mês, Kits 2/3/4 com bruto e líquido, salvar/reabrir, duplicar com outro nome, imprimir orçamentos e transformar em produto rascunho. Agora organizados nas seções recolhíveis.

**Why this priority**: São os diferenciais da nossa calculadora; não podem se perder na reforma.

**Independent Test**: Repetir um cálculo salvo antes da reforma e conferir que cada uma dessas funções continua presente e coerente.

**Acceptance Scenarios**:

1. **Given** Ads no modo embutido com ROAS 8, **When** o resultado é exibido, **Then** o passo a passo da campanha, a tabela de ROAS e o semáforo aparecem como hoje, já considerando imposto e as novas taxas.
2. **Given** kits 2/3/4, **When** a lista de extras tem itens de Embalagem e de Acabamento, **Then** no kit a Embalagem entra uma vez por pedido e os demais extras entram por peça.
3. **Given** um cálculo salvo, **When** o usuário duplica, imprime ou transforma em produto, **Then** funciona como hoje, levando os campos novos.

---

### User Story 6 - Abrir cálculos salvos no formato antigo (Priority: P2)

Cálculos salvos antes da reforma (um filamento, embalagem simples, mão de obra em horas × valor da hora, tempo por peça) abrem na nova tela convertidos, sem erro.

**Why this priority**: Já existem cálculos salvos usados nos orçamentos impressos.

**Independent Test**: Abrir um cálculo salvo antes da reforma e conferir que tempo, peso, preço do filamento, embalagem e mão de obra aparecem nos novos campos.

**Acceptance Scenarios**:

1. **Given** um cálculo antigo com mão de obra 0,25 h a R$ 20/h, **When** aberto, **Then** aparece um item de Mão de obra de R$ 5,00 em Custos extras.
2. **Given** um cálculo antigo com embalagem R$ 1,50, **When** aberto, **Then** o valor aparece no campo simples de embalagem.
3. **Given** um cálculo antigo com preço e vida útil da impressora, **When** aberto, **Then** esses valores aparecem em Desgaste da máquina.
4. **Given** um cálculo antigo, **When** aberto e salvo de novo, **Then** passa a ser gravado no formato novo.

---

### Edge Cases

- G-code muito grande (centenas de MB): a leitura não pode travar a tela; procura só os dados necessários e mostra erro se não encontrar.
- G-code com mais filamentos do que a lista tem: cria uma linha por filamento com o peso lido; o R$/kg fica para o usuário preencher (ou usa o do campo simples, se houver).
- Arquivo .3mf sem G-code dentro (projeto não fatiado): mensagem dizendo para exportar o arquivo fatiado.
- Tempo de impressão com minutos ≥ 60: normalizado em horas.
- Preço alvo vazio no modo Preço alvo: o resumo pede o preço em vez de mostrar números.
- Imposto + comissão + anúncio ≥ 100% no modo Margem mínima: mensagem "não existe preço que pague…" como hoje.
- Promoção de 100% ou mais: valor inválido, recusado.
- Remover o último item da lista de filamentos/extras: o campo simples volta a valer e é reativado.
- Peças por mesa = 0 ou vazio: potencial diário e mensal não aparecem.

## Requirements *(mandatory)*

### Functional Requirements

**Organização da tela**

- **FR-001**: A calculadora MUST organizar as entradas em seções recolhíveis: Modelo, Impressão, Custos extras, Precificação, Canal de venda, Ads / Tráfego pago, Concorrente e Produção no mês.
- **FR-002**: O resultado MUST continuar sendo calculado ao vivo, sem botão "Calcular".
- **FR-003**: O resumo MUST ter abas Venda direta, Shopee e Mercado Livre, e uma linha compacta comparando preço e lucro dos três canais.
- **FR-004**: A tela NÃO terá seletor de moeda nem os canais Etsy, TikTok Shop e Mercado Libre Argentina.

**Modelo**

- **FR-005**: A seção Modelo MUST reunir nome, link do modelo (MakerWorld), links do mesmo produto na Shopee e no Mercado Livre e altura (opcional).

**Impressão**

- **FR-006**: O usuário MUST poder carregar um G-code (.gcode ou .gcode.3mf do Bambu Studio) por arrastar ou escolher arquivo, e o sistema MUST preencher tempo de impressão e peso por filamento a partir dele.
- **FR-007**: O arquivo de G-code MUST ser lido apenas no navegador; não pode ser enviado a servidor nem guardado.
- **FR-008**: Falha ao ler o G-code MUST mostrar uma mensagem de erro clara na tela.
- **FR-009**: O usuário MUST poder escolher o modelo da impressora numa lista com consumo de referência (kWh/h), que preenche o consumo; o consumo continua editável.
- **FR-010**: O tempo de impressão MUST ser informado em horas e minutos.
- **FR-011**: O usuário MUST poder informar a taxa de falha (%), que gera uma "Reserva de falha" sobre o custo de impressão (material + energia + desgaste).
- **FR-012**: A perda de filamento (%) MUST continuar existindo.
- **FR-013**: O campo simples de filamento (peso g + R$/kg) MUST continuar; o usuário MUST poder adicionar uma lista de filamentos (nome/marca, cor, peso g, R$/kg). Com a lista preenchida, vale a soma da lista e o campo simples fica desativado.
- **FR-014**: O desgaste da máquina MUST entrar no custo: preço da impressora ÷ vida útil (h) × horas da mesa ÷ peças por mesa, com preço e vida útil editáveis (padrão R$ 3.070 e 4.000 h).

**Custos extras**

- **FR-015**: O usuário MUST poder adicionar custos extras (item, quantidade, preço unitário, categoria: Embalagem, Acabamento, Mão de obra, Outros) manualmente ou por botões rápidos: Caixa de papelão, Plástico bolha, Etiqueta, Fita adesiva, Saco plástico, Mão de obra.
- **FR-016**: O campo simples de embalagem MUST continuar; com a lista de extras preenchida, vale a lista e o campo simples fica desativado.
- **FR-017**: A mão de obra MUST deixar de ser calculada por horas × valor da hora e passar a ser um item de Custos extras.
- **FR-018**: No cálculo de kits, os extras da categoria Embalagem (ou o campo simples de embalagem) MUST entrar uma vez por pedido; os demais extras entram por peça.

**Precificação**

- **FR-019**: O usuário MUST poder escolher entre "Margem mínima" (informa % de lucro sobre o preço e recebe o preço de cada canal) e "Preço alvo" (informa o preço e vê margem de contribuição em R$ e %, markup e lucro).
- **FR-020**: No modo Preço alvo, MUST existir um atalho para usar o preço normal do concorrente como preço alvo.
- **FR-021**: O usuário MUST poder informar o imposto (%) sobre o preço de venda, com padrão 0%.
- **FR-022**: O usuário MUST poder ligar "Calcular com promoção" e informar o desconto (%); o lucro é calculado sobre o preço com desconto.

**Canal de venda**

- **FR-023**: Venda direta MUST oferecer forma de pagamento: Débito (1,99%), Crédito (2,99%), Pix (taxa editável, padrão 0%) e Outra (taxa digitada).
- **FR-024**: Venda direta MUST oferecer frete grátis (o custo de envio informado entra como custo) ou frete cobrado (não entra).
- **FR-025**: Shopee MUST oferecer tipo de conta CNPJ ou CPF; no CPF, volume de pedidos em 90 dias (até 450 sem taxa adicional; mais de 450 com + R$ 3,00 por item).
- **FR-026**: Shopee MUST exibir a tabela de comissão por faixa de preço vigente (01/10/2026) com comissão, taxa fixa, subsídio de frete e subsídio Pix, indicando que os subsídios são informativos e não entram no cálculo.
- **FR-027**: Shopee MUST oferecer, opcionalmente, Campanha de destaque (comissão extra em %) e Cupom de desconto próprio (valor em R$ absorvido como custo).
- **FR-028**: Mercado Livre MUST manter comissão (%) e custo fixo abaixo de R$ 79, como hoje.
- **FR-029**: O preço do site próprio MUST continuar sendo usado como preço do produto rascunho.

**Resumo**

- **FR-030**: Cada aba do resumo MUST mostrar: preço para o consumidor, custo por unidade, margem de contribuição (R$ e % do preço), markup (preço ÷ custo por unidade) e total de taxas do canal com o detalhamento (comissão, taxa fixa, adicionais, pagamento, imposto, anúncio).
- **FR-031**: O resumo MUST mostrar a composição do custo por unidade em barras: Material, Energia, Desgaste da máquina, Reserva de falha, Embalagem, Acabamento, Mão de obra e Outros (só as que tiverem valor).
- **FR-032**: O resumo MUST mostrar potencial diário e mensal de lucro, com a base usada (peças por mesa, ciclos por dia, horas por dia, dias no mês).

**Funções mantidas**

- **FR-033**: Ads MUST manter os modos sem anúncio, embutido no preço e do bolso, meta de ROAS, passo a passo da campanha, tabela de ROAS, semáforo e ACOS no Mercado Livre.
- **FR-034**: Concorrente MUST manter preço normal, oferta relâmpago, vendas no mês, comparativo com a margem para igualar, custo máximo e kit que bate.
- **FR-035**: Produção no mês e a tabela de kits 2/3/4 (bruto e líquido) MUST ser mantidas.
- **FR-036**: Salvar, reabrir, duplicar com outro nome, imprimir orçamentos e transformar em produto rascunho MUST continuar funcionando com os campos novos.
- **FR-037**: Todas as contas de lucro (canais, Ads, concorrente, kits, mês, orçamentos impressos) MUST considerar imposto, taxa de falha, extras e as novas taxas de canal.

**Compatibilidade**

- **FR-038**: Cálculos salvos no formato antigo MUST abrir convertidos: filamento único no campo simples, embalagem no campo simples, mão de obra (horas × valor da hora) como item de Mão de obra em Custos extras, preço e vida útil da impressora mantidos no desgaste.
- **FR-039**: Erros ao salvar, duplicar ou criar produto MUST continuar aparecendo na tela, com a resposta de erro visível na aba Network.
- **FR-040**: Textos novos MUST seguir o padrão de textos do admin já existente.

### Key Entities

- **Cálculo de preço**: nome, links, altura, valores da calculadora (impressão, filamentos, extras, precificação, canais, anúncio, concorrente, produção). Ganha campos novos e versão de formato para conversão dos antigos.
- **Filamento usado**: nome/marca, cor, peso (g), preço (R$/kg).
- **Custo extra**: item, quantidade, preço unitário (R$), categoria (Embalagem, Acabamento, Mão de obra, Outros).
- **Configuração de canal**: Venda direta (forma de pagamento e taxa, frete grátis/cobrado e custo de envio); Shopee (tipo de conta, volume de pedidos, faixas, campanha de destaque, cupom próprio); Mercado Livre (comissão, custo fixo).
- **Precificação**: modo (margem mínima / preço alvo), margem %, preço alvo, imposto %, promoção %.
- **Impressora de referência**: modelo e consumo de referência (kWh/h); preço e vida útil para o desgaste.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O sócio monta o preço de um produto novo (com G-code) em até 2 minutos.
- **SC-002**: Carregar um G-code preenche tempo e peso em até 3 segundos, sem nenhum envio de arquivo ao servidor.
- **SC-003**: 100% dos cálculos salvos antes da reforma abrem sem erro na nova tela.
- **SC-004**: Para um mesmo cenário, o lucro mostrado no resumo bate com a conta manual (preço − taxas − imposto − anúncio embutido − custo) com diferença de no máximo R$ 0,01.
- **SC-005**: Todas as funções listadas em FR-033 a FR-036 continuam disponíveis após a reforma.
- **SC-006**: O preço, a margem e o lucro de cada canal ficam visíveis sem rolar a página inteira (no resumo, por abas).

## Assumptions

- Só administradores (sócios) usam a calculadora; continua dentro do admin já autenticado.
- A tabela de faixas da Shopee vigente é a de 01/10/2026 já usada no sistema (até R$ 79,99: 20% + R$ 4,50; R$ 80–99,99: 14% + R$ 16; R$ 100–199,99: 14% + R$ 20; R$ 200+: 14% + R$ 26). Subsídios de frete e Pix são exibidos só como informação.
- Taxas de pagamento padrão na venda direta: Débito 1,99%, Crédito 2,99%, Pix 0% (editável).
- A taxa de falha incide sobre material + energia + desgaste (custo de impressão), não sobre extras.
- O imposto incide sobre o preço de venda (com desconto, se houver promoção); padrão 0% porque hoje a venda é no CPF.
- Na promoção, o "preço para o consumidor" é o preço com desconto; o preço cheio aparece como referência (preço "de").
- A lista de impressoras de referência começa com as Bambu Lab mais comuns (A1 mini, A1, P1S, X1C) e "Outra" (consumo digitado).
- Potencial diário/mensal usa a produção já existente (peças por mesa, tempo da mesa cheia, horas por dia, dias no mês).
- Venda direta passa a ter taxa de pagamento e frete; o preço do site próprio (produto rascunho) continua usando a taxa do site configurada.
- O orçamento impresso passa a usar as mesmas contas novas.
