# Data Model: Calculadora de preço no modelo do curso

Coleção existente `calculosPreco` (MongoDB). Só muda o objeto `valores` (texto, como hoje). Sem migração em lote: o formato antigo é convertido ao abrir (`normalizarValores`) e gravado no novo ao salvar.

## CalculadoraValores (versão 2)

```ts
interface CalculadoraValores {
  versao?: 2;                         // ausente = formato antigo (v1)
  impressao?: ImpressaoCalculadora;   // v2
  precificacao?: PrecificacaoCalculadora; // v2
  vendaDireta?: VendaDiretaCalculadora;   // v2
  custo?: CustoProducaoFormValores;   // v1 (legado) — só lido na conversão
  alturaCm?: string;
  margemMinimaPrecoPercentual?: string;   // continua sendo a margem mínima (% do preço)
  anuncio?: AnuncioCalculadoraValores;    // sem mudança
  precoConcorrenteReais?: string;
  precoConcorrenteOfertaReais?: string;
  vendasConcorrenteMes?: string;
  canais: { shopee: CanalCalculadoraValores; mercadoLivre: CanalCalculadoraValores };
  producao: { pecasPorMesa?: string; horasMesaCheia?: string; horasPorDia: string; diasPorMes: string };
  pecasPorMes: string;
}
```

### ImpressaoCalculadora (tudo da **mesa**)

| Campo | Tipo | Regra |
|---|---|---|
| impressora | `"a1mini" \| "a1" \| "p1s" \| "x1c" \| "outra"` | trocar sugere `consumoKwh` |
| consumoKwh | string | > 0 |
| tarifaEnergiaReais | string | ≥ 0 |
| precoImpressoraReais | string | ≥ 0 (desgaste) |
| vidaUtilHoras | string | > 0 quando preço > 0 |
| pecasPorMesa | string | inteiro ≥ 1 |
| tempoHoras / tempoMinutos | string | total > 0; minutos ≥ 60 normalizados |
| perdaPercentual | string | 0–99,9 (sobre filamento) |
| taxaFalhaPercentual | string | 0–99,9 (sobre material + energia + desgaste) |
| pesoGramas / precoKgReais | string | campo simples — usado só com `filamentos` vazio |
| filamentos | FilamentoCalculadora[] | não vazio = substitui o campo simples |
| embalagemReais | string | campo simples — usado só com `extras` vazio |
| extras | ExtraCalculadora[] | não vazio = substitui o campo simples |

`FilamentoCalculadora { nome, cor, pesoGramas, precoKgReais }` (strings).
`ExtraCalculadora { item, quantidade, precoReais, categoria: "embalagem" | "acabamento" | "maoDeObra" | "outros" }` — valores **por unidade vendida**.

### PrecificacaoCalculadora

| Campo | Tipo | Padrão |
|---|---|---|
| modo | `"margem" \| "alvo"` | `"margem"` |
| precoAlvoReais | string | `""` |
| impostoPercentual | string | `"0"` |
| promocaoAtiva | boolean | false |
| promocaoPercentual | string | `""` |

### VendaDiretaCalculadora

| Campo | Tipo | Padrão |
|---|---|---|
| pagamento | `"debito" \| "credito" \| "pix" \| "outra"` | `"pix"` |
| taxaPixPercentual | string | `"0"` |
| taxaOutraPercentual | string | `""` |
| frete | `"gratis" \| "cobrado"` | `"cobrado"` |
| custoEnvioReais | string | `""` |

Débito 1,99% e Crédito 2,99% são fixos (constantes).

### CanalCalculadoraValores (Shopee ganha campos)

| Campo novo | Tipo | Regra |
|---|---|---|
| tipoConta | `"cnpj" \| "cpf"` | padrão `"cpf"`; `cpfAcima450Pedidos` só vale com CPF |
| campanhaDestaque | boolean | liga a comissão extra |
| campanhaPercentual | string | padrão `"2"` |
| cupomAtivo | boolean | — |
| cupomReais | string | custo por pedido |

## Conversão v1 → v2 (`normalizarValores`)

| v1 | v2 |
|---|---|
| producao.pecasPorMesa > 0 e horasMesaCheia > 0 | pecasPorMesa = pecasPorMesa; tempo = horasMesaCheia; pesoGramas = pesoPeca × peças |
| senão | pecasPorMesa = 1; tempo = tempoImpressaoHoras; pesoGramas = pesoPecaGramas |
| precoCarreteReais ÷ pesoCarreteGramas × 1000 | precoKgReais |
| margemPerdaPercentual / taxaFalhaPercentual | perdaPercentual / taxaFalhaPercentual |
| consumoEletricoKwh / tarifaEnergiaReais | consumoKwh / tarifaEnergiaReais; impressora = "outra" |
| precoImpressoraReais / vidaUtilImpressoraHoras | precoImpressoraReais / vidaUtilHoras |
| custoEmbalagemReais | embalagemReais |
| tempoMaoDeObraHoras × valorHoraTrabalhoReais > 0 | extras += { item: "Mão de obra", qtd 1, preço = produto, categoria maoDeObra } |
| custoAcessoriosReais > 0 | extras += { item: "Acessórios", qtd 1, categoria outros } |
| (extras ficou não vazio e embalagem > 0) | extras += { item: "Embalagem", categoria embalagem } para não perder a embalagem |
| canais.shopee.cpfAcima450Pedidos | tipoConta = "cpf" |
| sem precificacao / vendaDireta | padrões acima |

## Resultado (função pura `calcularResultado`)

- **CustoUnidade**: material, energia, desgaste, falha, embalagem, acabamento, maoDeObra, outros, total (centavos, cada um arredondado; total = soma).
- **ResultadoCanal** (direta, shopee, mercadoLivre): `faixas`, `custoVendaCentavos` (frete grátis / cupom, por pedido), `impostoPercentual`, `precoMargemCentavos` (preço que dá a margem mínima), `precoCentavos` (praticado: alvo ou margem), `precoCheioCentavos` (promoção), `venda` (comissão, fixa, adicional CPF, campanha, pagamento, imposto, anúncio, lucro, margem %), `markup`.
- **Producao**: peças por mesa, horas da mesa, mesas/dia, peças/dia, peças/mês automático.
