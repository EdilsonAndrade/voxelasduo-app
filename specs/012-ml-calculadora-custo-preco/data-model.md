# Data Model: Calculadora de custo e preço sugerido (Mercado Livre)

## Produto (extensão do modelo existente)

Arquivo: `lib/models/produto.ts`. Adiciona um campo opcional `custoProducao` ao `Produto` existente — opcional porque produtos já cadastrados hoje não têm esses dados, e a spec exige que a ausência não bloqueie o cadastro (FR-011, Edge Cases).

```ts
/** Custo de produção estimado (COGS) de uma peça impressa em 3D — específico deste produto (EDI-92). */
export interface CustoProducao {
  /** Peso da peça impressa, em gramas. */
  pesoPecaGramas: number;
  /** Tempo de impressão da peça, em horas. */
  tempoImpressaoHoras: number;
  /** Tempo de mão de obra/acabamento (preparo, limpeza, embalagem), em horas. */
  tempoMaoDeObraHoras: number;
  /** Preço pago pelo carretel de filamento, em centavos. */
  precoCarreteCentavos: number;
  /** Peso total do carretel de filamento, em gramas. */
  pesoCarreteGramas: number;
  /** Margem de perda/purga/testes, em percentual (ex: 10 = 10%). */
  margemPerdaPercentual: number;
  /** Preço de compra da impressora, em centavos. */
  precoImpressoraCentavos: number;
  /** Vida útil estimada da impressora, em horas. */
  vidaUtilImpressoraHoras: number;
  /** Consumo elétrico médio da impressora durante a impressão, em kWh. */
  consumoEletricoKwh: number;
  /** Tarifa de energia elétrica, em centavos por kWh. */
  tarifaEnergiaCentavos: number;
  /** Valor da hora de trabalho do operador, em centavos. */
  valorHoraTrabalhoCentavos: number;
  /** Custo de embalagem/envio por unidade, em centavos. */
  custoEmbalagemCentavos: number;
}

export interface Produto {
  // ...campos existentes inalterados...
  /** Custo de produção específico deste produto — ausente = ainda não configurado (EDI-92). */
  custoProducao?: CustoProducao;
}
```

**Convenção de unidades monetárias**: todos os valores em dinheiro são armazenados em centavos (inteiros), seguindo a convenção já usada em `produto.preco` (`lib/estoque/canais/mercadoLivre/client.ts` já documenta essa convenção). O formulário converte para/de reais (string com vírgula/ponto) na camada de UI, como já é feito para `precoReais` em `ProdutoForm.tsx`.

**Validação** (estende `lib/produtos/validation.ts`):
- Quando `custoProducao` está presente no payload, todos os seus campos são obrigatórios e devem ser números finitos; os campos de peso, tempo, preço de carretel/impressora/hora/embalagem e tarifa devem ser `> 0`; `pesoCarreteGramas` e `vidaUtilImpressoraHoras` devem ser `> 0` (usados como denominador); `margemPerdaPercentual` deve ser `>= 0`.
- `custoProducao` continua opcional no payload — sua ausência não é erro (produto pode ser salvo sem custo de produção preenchido, conforme Edge Cases da spec).

## Resultado de Cálculo de COGS (não persistido)

Retornado por `calcularCustoProducao(custo: CustoProducao)` em `lib/produtos/custoProducao.ts` — tipo de saída, não persistido no banco (derivado sob demanda a partir de `CustoProducao`).

```ts
export interface ResultadoCogs {
  custoFilamentoCentavos: number;
  custoEnergiaCentavos: number;
  custoDepreciacaoCentavos: number;
  custoMaoDeObraCentavos: number;
  custoEmbalagemCentavos: number;
  /** Soma de todos os componentes acima. */
  totalCentavos: number;
}
```

## Comissão do Mercado Livre (não persistida)

Retornado pela rota `POST /api/mercado-livre/simular-preco` (ver `contracts/`) — dado transitório, não persistido no banco (é específico de um preço/categoria consultados no momento).

```ts
export interface ComissaoMercadoLivre {
  categoryId: string;
  listingTypeId: string;
  /** Custo de anunciar (geralmente zero para gold_special). */
  listingFeeAmountCentavos: number;
  /** Custo total de venda (comissão + taxa fixa), já no valor total. */
  saleFeeAmountCentavos: number;
  /** Percentual de comissão aplicado sobre o preço. */
  percentageFee: number;
  /** Taxa fixa de venda, quando aplicável (preços baixos). */
  fixedFeeCentavos: number;
}
```

## Simulação de Precificação (não persistida, calculada no cliente)

Combina `ResultadoCogs` + `ComissaoMercadoLivre` (real ou sobrescrita manualmente) + preço de venda digitado:

```ts
export interface SimulacaoPrecificacao {
  precoVendaCentavos: number;
  cogsCentavos: number;
  comissaoCentavos: number;
  lucroLiquidoCentavos: number;
  margemPercentual: number;
  /** true quando lucroLiquidoCentavos < 0. */
  prejuizo: boolean;
  /** true quando margemPercentual está abaixo do limite mínimo configurado pelo usuário. */
  margemBaixa: boolean;
}
```

**Relações**: `CustoProducao` pertence a exatamente um `Produto` (1:1, embutido no documento, não é uma coleção separada). `ComissaoMercadoLivre` e `SimulacaoPrecificacao` não têm persistência própria — são derivados em tempo real a partir do `Produto` (ou dos dados ainda não salvos do formulário) e do preço digitado.
