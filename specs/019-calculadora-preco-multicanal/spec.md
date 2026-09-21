# Feature Specification: Calculadora de preço multicanal com margem real

**Feature Branch**: `main` (trabalho direto na main, por decisão do solicitante — sem branch de feature)  
**Created**: 2026-09-21  
**Status**: Draft  
**Input**: Linear EDI-106 — "Calculadora de preço multicanal com margem real (ML, Shopee e site próprio)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comparar preço sugerido e margem por canal (Priority: P1)

Ao cadastrar ou editar um produto, o vendedor preenche os custos de produção (já existentes) e a margem desejada e vê, lado a lado, o preço sugerido para Mercado Livre, Shopee e site próprio. Para cada canal aparecem a comissão/taxa aplicada, o lucro líquido (R$) e a margem líquida (%), de forma que ele decide onde vender e por qual preço sem planilha externa.

**Why this priority**: É o núcleo do ticket: hoje o simulador só mostra o Mercado Livre. Sem o comparativo, o vendedor não enxerga qual canal rende mais.

**Independent Test**: Preencher os custos de uma peça e a margem desejada e conferir que os três canais exibem preço sugerido, taxa, lucro líquido e margem, em menos de 1 minuto.

**Acceptance Scenarios**:

1. **Given** um produto com custo de produção preenchido e margem desejada definida, **When** o vendedor abre o simulador, **Then** vê um bloco por canal (Mercado Livre, Shopee, site próprio) com preço sugerido, taxa/comissão, lucro líquido (R$) e margem (%).
2. **Given** canais com taxas diferentes, **When** o preço sugerido é calculado, **Then** cada canal desconta a própria taxa antes de aplicar a margem, de modo que o lucro líquido de cada canal corresponde à margem desejada sobre o custo.
3. **Given** que a comissão real do Mercado Livre não pôde ser consultada, **When** o vendedor vê o comparativo, **Then** o canal Mercado Livre usa a taxa estimada/manual já existente e os demais canais continuam funcionando normalmente.
4. **Given** um canal cuja taxa somada chegaria a 100% ou mais, **When** o preço seria calculado, **Then** o canal exibe aviso de taxa inválida em vez de um preço.
5. **Given** um canal com margem abaixo do mínimo configurado ou com prejuízo, **When** exibido, **Then** recebe o mesmo alerta visual já usado hoje no simulador.

---

### User Story 2 - Configurar taxas da Shopee e do site próprio (Priority: P1)

O vendedor define uma taxa estimada da Shopee (padrão ~14%, editável) e a taxa do meio de pagamento do site próprio (percentual + taxa fixa opcional por venda). Esses valores ficam como padrão global no admin e podem ser sobrescritos por produto quando um item tem condição diferente.

**Why this priority**: Sem taxas realistas o comparativo não tem valor; a Shopee não tem consulta automática e o gateway varia por operação.

**Independent Test**: Alterar o padrão global da Shopee de 14% para outro valor e ver o preço sugerido mudar em produtos sem override; sobrescrever em um produto e ver só ele mudar.

**Acceptance Scenarios**:

1. **Given** que nenhuma configuração foi salva, **When** o vendedor abre o simulador, **Then** a Shopee usa 14% como taxa padrão e o site próprio usa um padrão inicial (percentual do gateway padrão, taxa fixa zero).
2. **Given** um padrão global editado no admin, **When** o vendedor abre qualquer produto sem override, **Then** o comparativo usa os valores globais atualizados.
3. **Given** um produto com taxa própria informada para um canal, **When** o simulador é aberto, **Then** esse canal usa o valor do produto, e os demais campos continuam herdando o global.
4. **Given** que o vendedor apaga o override de um produto, **When** salva, **Then** o produto volta a usar o padrão global.
5. **Given** valores inválidos (negativos, percentual ≥ 100), **When** o vendedor tenta salvar, **Then** o sistema recusa com mensagem clara.

---

### User Story 3 - Considerar taxa de falha de impressão no custo (Priority: P2)

O vendedor informa a taxa de falha (%) de impressão de cada peça. O custo considerado passa a ser o custo médio por peça boa (custo ÷ (1 − falha)), pois peças perdidas consomem filamento, energia, máquina e mão de obra. A "margem de perda/purga" atual cobre apenas o desperdício de filamento, por isso a taxa de falha é um campo próprio e complementar.

**Why this priority**: Evita vender com margem ilusória quando há peças descartadas, mas o comparativo (US1/US2) já entrega valor sem ela.

**Independent Test**: Informar 10% de falha e ver o custo por peça boa e os preços sugeridos subirem proporcionalmente; com 0% os valores ficam idênticos aos atuais.

**Acceptance Scenarios**:

1. **Given** uma taxa de falha de 0% (ou vazia), **When** o custo é calculado, **Then** o resultado é idêntico ao de hoje (sem regressão).
2. **Given** uma taxa de falha de 10%, **When** o custo é calculado, **Then** o custo por peça boa é o custo de produção dividido por 0,90 e todos os canais usam esse valor.
3. **Given** a margem de perda de filamento e a taxa de falha ambas preenchidas, **When** o custo é calculado, **Then** os dois efeitos são aplicados sem dupla contagem do mesmo desperdício (perda só sobre o filamento; falha sobre o custo total da peça).
4. **Given** uma taxa de falha ≥ 100%, **When** o vendedor tenta informar, **Then** o sistema recusa com mensagem clara.

---

### User Story 4 - Copiar custos de produção de outro produto (Priority: P2)

Ao cadastrar um produto parecido com um já existente, o vendedor escolhe outro produto e copia seus parâmetros de custo de produção para o formulário atual, ajusta o que for diferente e salva, sem redigitar tudo.

**Why this priority**: Ganho de produtividade no cadastro em lote; não bloqueia o restante.

**Independent Test**: Em um produto novo, escolher um produto existente, copiar os custos e ver os campos preenchidos e editáveis; salvar e reabrir mantendo os valores.

**Acceptance Scenarios**:

1. **Given** um produto em edição/cadastro, **When** o vendedor escolhe outro produto na ação "copiar custos de…", **Then** os campos de custo de produção (e taxas por produto, se houver) são preenchidos com os valores do produto escolhido.
2. **Given** campos já preenchidos no formulário atual, **When** o vendedor copia de outro produto, **Then** o sistema pede confirmação antes de sobrescrever.
3. **Given** que o produto de origem não possui custos preenchidos, **When** o vendedor tenta copiar, **Then** o sistema avisa que não há dados para copiar e nada muda.
4. **Given** a cópia realizada, **When** o vendedor edita os valores e salva, **Then** apenas o produto atual é alterado; o produto de origem permanece intacto.
5. **Given** a cópia realizada e salva, **When** o produto é reaberto, **Then** os parâmetros aparecem salvos para edição.

---

### Edge Cases

- Custo de produção zerado ou não preenchido: o comparativo exibe estado vazio orientando a preencher os custos, sem preços absurdos.
- Margem desejada muito alta ou taxa de canal muito alta: preço sugerido válido só enquanto taxa < 100%; caso contrário aviso.
- Taxa fixa do gateway em preços baixos: entra no cálculo do preço sugerido (o preço cobre percentual e taxa fixa).
- Produto antigo sem taxa de falha nem overrides: continua funcionando com padrões (falha 0%, taxas globais).
- Alteração do padrão global: não reescreve overrides já salvos em produtos.
- Mudança de idioma: todos os textos do comparativo e dos novos campos aparecem traduzidos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST exibir, no simulador de precificação do produto, um comparativo lado a lado dos canais Mercado Livre, Shopee e site próprio.
- **FR-002**: Para cada canal, o sistema MUST exibir preço sugerido, comissão/taxa aplicada, lucro líquido (R$) e margem líquida (%).
- **FR-003**: O preço sugerido de cada canal MUST descontar a taxa do próprio canal (percentual e, quando houver, taxa fixa) antes de embutir a margem desejada.
- **FR-004**: O canal Mercado Livre MUST continuar usando a comissão real consultada quando disponível, com o fallback de taxa estimada/manual já existente.
- **FR-005**: O sistema MUST permitir configurar a taxa estimada da Shopee (padrão 14%), sem depender de consulta externa.
- **FR-006**: O sistema MUST permitir configurar a taxa do site próprio com percentual do meio de pagamento e taxa fixa opcional por venda.
- **FR-007**: As taxas de Shopee e site próprio MUST ter um valor padrão global editável no admin e MUST poder ser sobrescritas por produto; produto sem override herda o global.
- **FR-008**: O sistema MUST permitir informar uma taxa de falha (%) por produto e calcular o custo por peça boa como custo ÷ (1 − falha), aplicado a todos os canais.
- **FR-009**: A margem de perda/purga existente MUST permanecer aplicada apenas ao desperdício de filamento; a taxa de falha é campo próprio e complementar, sem dupla contagem.
- **FR-010**: O sistema MUST permitir copiar os parâmetros de custo de produção de outro produto para o produto em edição/cadastro, pedindo confirmação quando houver dados já preenchidos e mantendo tudo editável.
- **FR-011**: Os parâmetros (custos, taxa de falha e overrides de taxa) MUST ser salvos por produto e reabrir para edição.
- **FR-012**: O sistema MUST validar entradas (taxas e falha entre 0 e menos de 100%, valores monetários não negativos) e exibir mensagens claras.
- **FR-013**: O sistema MUST manter os alertas de prejuízo e margem abaixo do mínimo, agora por canal.
- **FR-014**: Todos os textos novos MUST seguir o padrão de internacionalização já existente no projeto, em todos os idiomas suportados.
- **FR-015**: Produtos existentes MUST continuar funcionando sem migração manual (falha 0%, taxas herdadas do global).

### Key Entities

- **Taxas de canal (padrão global)**: Configuração única da loja com taxa estimada da Shopee (%) e taxa do site próprio (% do meio de pagamento + taxa fixa opcional). Editável no admin.
- **Taxas de canal do produto (override)**: Valores opcionais por produto que sobrescrevem o padrão global de cada canal; ausência significa "herdar do global".
- **Custo de produção do produto (existente, ampliado)**: Parâmetros de custo já existentes acrescidos da taxa de falha (%). Pertence a um único produto; pode ser copiado para outro (cópia de valores, sem vínculo posterior).
- **Resultado por canal**: Preço sugerido, taxa aplicada, lucro líquido e margem de um canal para o custo e margem atuais (calculado, não armazenado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Preenchendo os parâmetros de uma peça, o vendedor vê o preço sugerido dos três canais em menos de 1 minuto.
- **SC-002**: Em 100% dos casos, o lucro líquido exibido de cada canal ao preço sugerido equivale à margem desejada, considerando a taxa do próprio canal.
- **SC-003**: Margem líquida em R$ e % aparece junto do preço sugerido em 100% dos canais exibidos.
- **SC-004**: O vendedor copia os parâmetros de um produto para outro e ajusta em menos de 30 segundos, sem redigitar os campos.
- **SC-005**: 100% dos parâmetros salvos reabrem para edição com os mesmos valores.
- **SC-006**: Produtos existentes exibem os mesmos custos e preços de antes quando falha = 0%, sem qualquer ação do vendedor.

## Assumptions

- O usuário é o próprio vendedor/administrador da loja, autenticado no painel admin existente.
- O comparativo estende o simulador de precificação existente (EDI-92); custos de produção, comissão real do ML, preço sugerido e preço de escala continuam como estão.
- A taxa padrão inicial do meio de pagamento do site próprio será um valor razoável de mercado (ajustável), pois o gateway final pode variar.
- A cópia de custos entre produtos é apenas de valores (sem "modelos salvos" nem nova entidade de modelos); é ação pontual, sem vínculo posterior com o produto de origem.
- Fora de escopo: ajuste automático de preço por concorrência e integração com API da Shopee ou dos gateways de pagamento.
- O trabalho é feito direto na `main` (decisão do solicitante); o Linear EDI-106 é a referência do ticket.
