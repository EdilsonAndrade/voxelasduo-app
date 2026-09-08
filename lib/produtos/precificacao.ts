/** Comissão de venda do Mercado Livre para um preço/categoria/tipo de anúncio consultados (EDI-92). */
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

/** Resultado da simulação de precificação: COGS + comissão (real ou manual) para um preço de venda digitado. */
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

/**
 * Combina custo de produção (US1) + comissão do Mercado Livre, real ou
 * sobrescrita manualmente (US2), para o preço de venda digitado — função
 * pura (FR-008/FR-009/FR-010). `prejuizo` e `margemBaixa` são sinalizados de
 * forma independente para permitir alertas visuais distintos.
 */
export function calcularSimulacaoPrecificacao(
  cogsCentavos: number,
  comissaoCentavos: number,
  precoVendaCentavos: number,
  margemMinimaPercentual: number
): SimulacaoPrecificacao {
  const lucroLiquidoCentavos = precoVendaCentavos - cogsCentavos - comissaoCentavos;
  const margemPercentual =
    precoVendaCentavos > 0 ? (lucroLiquidoCentavos / precoVendaCentavos) * 100 : 0;

  return {
    precoVendaCentavos,
    cogsCentavos,
    comissaoCentavos,
    lucroLiquidoCentavos,
    margemPercentual,
    prejuizo: lucroLiquidoCentavos < 0,
    margemBaixa: margemPercentual < margemMinimaPercentual,
  };
}

/**
 * Sugere um preço de venda a partir do custo de produção, da margem de
 * lucro desejada e da taxa (percentual) estimada da plataforma — mesma
 * fórmula do modelo de custos já usado internamente pelo solicitante:
 * `(custo * (1 + margem)) / (1 - taxa)`. Retorna `null` quando a taxa
 * informada é `>= 100%` (a fórmula divide por zero ou fica negativa nesse
 * caso, o que não representa um preço válido).
 */
export function calcularPrecoSugerido(
  cogsCentavos: number,
  margemDesejadaPercentual: number,
  taxaPlataformaPercentual: number
): number | null {
  if (taxaPlataformaPercentual >= 100) return null;

  const precoSugeridoCentavos =
    (cogsCentavos * (1 + margemDesejadaPercentual / 100)) / (1 - taxaPlataformaPercentual / 100);

  return Math.round(precoSugeridoCentavos);
}
