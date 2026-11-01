# Data Model: Frete no checkout

## ServicoFrete
`"pac" | "sedex" | "combinar"`. Ordem de exibição: PAC, SEDEX, Combinar.

| Serviço | Rótulo | Valor |
|---|---|---|
| pac | PAC | `FreteConfig.pacCentavos` (ou calculado) |
| sedex | SEDEX | `FreteConfig.sedexCentavos` (ou calculado) |
| combinar | Combinar com a loja | 0 (Grátis) |

## FreteConfig (coleção `configuracoes`, `_id: "frete"`)
| Campo | Tipo | Regra |
|---|---|---|
| pacCentavos | number | inteiro ≥ 0, obrigatório. Padrão 1990 |
| sedexCentavos | number | inteiro ≥ 0, obrigatório. Padrão 2550 |
| atualizadoEm | Date | gravado ao salvar |

Sem documento salvo, valem os valores de `FRETE_PADRAO`.

## OpcaoFrete (resposta de cálculo, não persistida)
| Campo | Tipo |
|---|---|
| servico | ServicoFrete |
| rotulo | string |
| valorCentavos | number |
| origem | `"fixo" \| "calculado" \| "gratis"` |

## FretePedido (`Pedido.frete`, opcional)
| Campo | Tipo | Regra |
|---|---|---|
| servico | ServicoFrete | escolhido pelo cliente |
| valorCentavos | number | valor do servidor no momento da criação |
| origem | `"fixo" \| "calculado" \| "gratis"` | de onde veio o valor |

`Pedido.valorTotal` = Σ(precoUnitario × quantidade) + `frete.valorCentavos`.
Pedidos antigos e externos não têm `frete`, e a exibição omite a linha.

## Validações
- Checkout: `frete.servico` deve estar em `SERVICOS_FRETE`; `frete.valorCentavos` deve ser inteiro ≥ 0. Erro em `campos.frete`: "Escolha a forma de entrega."
- Config: cada valor deve ser inteiro finito ≥ 0. Erro em `campos.pacCentavos` / `campos.sedexCentavos`: "Informe um valor de frete válido (R$ 0,00 ou mais)."
