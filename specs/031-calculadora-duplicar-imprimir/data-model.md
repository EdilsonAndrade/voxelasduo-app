# Data Model

## CalculadoraValores (existente, `lib/models/calculoPreco.ts`)
- `+ alturaCm?: string` — altura da peça em cm, opcional, só informativa.

## LinhaOrcamento (derivada, não gravada)
| Campo | Tipo | Regra |
|---|---|---|
| unidades | number | 1 = avulso; 2–4 = kit |
| custoPedidoCentavos | number | `calcularCustoKit(custo, embalagem, unidades)` |
| precoCentavos | number \| null | `calcularPrecoPorMargem` com anúncio `100/roas`; null = sem preço possível |
| taxaCentavos, anuncioCentavos, lucroPedidoCentavos | number | `detalharVenda` |
| margemPercentual | number | lucro ÷ preço |
| pedidosMes | number \| null | ⌊peças no mês ÷ unidades⌋; null sem produção |
| faturamentoMesCentavos, lucroMesCentavos | number \| null | × pedidosMes |

## OrcamentoProduto (derivado)
- `custoPecaCentavos | null` (null = falta custo), `roas`, `margemPercentual`, `pecasPorMesa`, `horasMesaCheia`, `precoConcorrenteCentavos | null`, `linhas: LinhaOrcamento[]` (avulso + kit).
