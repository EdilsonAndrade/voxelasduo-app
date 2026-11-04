# Research: Anúncio pago opcional e margem líquida

## R1 — Onde o anúncio entra na conta do preço

- **Decision**: `TaxaCanal.anuncioPercentual?: number` (= 100 ÷ ROAS). `precoPorTaxa` usa `1 − (taxa% + anúncio% + margem%)` como divisor. `calcularResultadoCanal` calcula `anuncioCentavos = preço × anúncio%` e desconta do lucro. `comissaoCanal` continua só com a taxa do canal.
- **Rationale**: todo lugar que já calcula preço com `TaxaCanal` (simulador, preço mínimo, listagem de produtos) passa a respeitar o anúncio sem mudar a assinatura. A linha do anúncio fica separada da comissão (FR-007).
- **Alternatives considered**: somar o anúncio ao `percentual` da taxa. Foi descartado porque misturaria anúncio com comissão no detalhamento e no desconto máximo.

## R2 — Canais que pagam anúncio

- **Decision**: o anúncio vale só para os marketplaces: Shopee e Mercado Livre no produto, Shopee no Tempo de Impressão. Site próprio e venda direta ficam sem anúncio.
- **Rationale**: é a regra que a calculadora já usa (`anuncioEmbutidoPercentual` só nos marketplaces). ROAS de Shopee Ads e Mercado Livre Ads não se aplica à venda direta.
- **Alternatives considered**: aplicar em todos os canais. Foi descartado porque inflaria o preço do site sem campanha.

## R3 — Margem do Tempo de Impressão

- **Decision**: `margemPercentual` do item passa a ser % do preço. O preço vem de `calcularPrecoPorMargem({ custo: custoPedido, faixas, margemPrecoPercentual: m, anuncioPercentual, impostoPercentual })` e o lucro de `detalharVenda` com o mesmo anúncio. Margem vazia usa `regua.pisoPercentual` (piso configurado, 25% por padrão). Abaixo do piso, o cálculo segue e um aviso aparece.
- **Rationale**: é a mesma conta da calculadora, então SC-002 (mesmo preço nas duas telas) sai por construção.
- **Validação**: de 0 a 99,9 (antes ia até 1000% sobre o custo). Um valor antigo ≥ 100 continua gravado e mostra "sem preço possível" até ser editado. O PUT seguinte recusa com 400 e mensagem clara.

## R4 — Conjunto com várias partes

- **Decision**: a margem do conjunto é a média das margens das partes, ponderada pelo custo de cada parte, aplicada sobre o preço do conjunto.
- **Rationale**: mantém a ideia atual (soma dos ganhos de cada parte) na régua do preço.

## R5 — Kits que importam do Tempo de Impressão

- **Decision**: `pecaDoPlano` converte a margem líquida em markup equivalente, `m ÷ (100 − m) × 100`, porque o kit calcula `custo × (1 + markup)`.
- **Rationale**: a margem do kit continua sendo markup. A conversão preserva a intenção: 25% líquido vira 33,3% de markup.

## R6 — Persistência do anúncio

- **Decision**: o formato é `{ ativo: boolean; roasMeta: number }`, com `roasMeta > 0` e até 100. Fica em `PlanoImpressao.anuncio` e em `TaxasCanaisProduto.anuncio`. Ausente quer dizer desligado. O ROAS fica gravado mesmo com o toggle desligado.
- **Rationale**: produtos e planos antigos abrem iguais (FR-011), e religar o toggle não perde o ROAS.

## R7 — Calculadora

- **Decision**: o modelo não muda (`modo: sem | embutido | bolso`). A `SecaoAds` usa `Interruptor` "Anúncio pago": desligado grava `sem`, ligado grava `embutido` como padrão e mostra a opção "do bolso".
- **Rationale**: cálculos salvos abrem com o mesmo resultado (FR-011).
