# Data Model: Calculadora de preço multicanal

Valores monetários em centavos, percentuais em número (ex.: 14 = 14%), mesma convenção do restante do projeto.

## TaxasCanaisConfig (nova — coleção `configuracoes`, `_id: "taxasCanais"`)

| Campo | Tipo | Regra |
|---|---|---|
| `shopeeTaxaPercentual` | number | 0 ≤ x < 100; padrão 14 |
| `siteTaxaPercentual` | number | 0 ≤ x < 100; padrão 4.99 |
| `siteTaxaFixaCentavos` | number | ≥ 0; padrão 0 |
| `atualizadoEm` | Date | definido ao salvar |

Documento único; ausente = usa defaults (não é criado até o primeiro salvamento).

## TaxasCanaisProduto (nova, embutida em `Produto.taxasCanais?`)

Todos os campos opcionais; ausente = herdar do global.

| Campo | Tipo | Regra |
|---|---|---|
| `shopeeTaxaPercentual?` | number | 0 ≤ x < 100 |
| `siteTaxaPercentual?` | number | 0 ≤ x < 100 |
| `siteTaxaFixaCentavos?` | number | ≥ 0 |

## CustoProducao (alterado)

- `taxaFalhaPercentual?: number` — 0 ≤ x < 100; ausente = 0. Custo por peça boa = custo ÷ (1 − falha).
- `margemPerdaPercentual` permanece só sobre o filamento.

## Resultado por canal (calculado, não armazenado)

`{ canal, taxaPercentual, taxaFixaCentavos, precoSugeridoCentavos | null, comissaoCentavos, lucroLiquidoCentavos, margemPercentual, prejuizo, margemBaixa }`

## Migração

Nenhuma: todos os campos novos são opcionais; produtos existentes se comportam como falha 0% e taxas globais.
