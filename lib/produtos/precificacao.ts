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
  /** Lucro em % do preço de venda. */
  margemPercentual: number;
  /** Lucro em % sobre o custo (markup) — só informativo. */
  markupPercentual: number;
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
  const margemPercentual = precoVendaCentavos > 0 ? (lucroLiquidoCentavos / precoVendaCentavos) * 100 : 0;
  const markupPercentual = cogsCentavos > 0 ? (lucroLiquidoCentavos / cogsCentavos) * 100 : 0;

  return {
    precoVendaCentavos,
    cogsCentavos,
    comissaoCentavos,
    lucroLiquidoCentavos,
    margemPercentual,
    markupPercentual,
    prejuizo: lucroLiquidoCentavos < 0,
    margemBaixa: margemPercentual < margemMinimaPercentual,
  };
}

/**
 * Sugere um preço de venda a partir do custo de produção, da margem de lucro
 * desejada (em % do preço) e da taxa (percentual) estimada da plataforma:
 * `custo / (1 − taxa − margem)` — nesse preço o lucro é exatamente a margem
 * do preço. Retorna `null` quando taxa + margem é `>= 100%` (não existe preço).
 */
export function calcularPrecoSugerido(
  cogsCentavos: number,
  margemDesejadaPercentual: number,
  taxaPlataformaPercentual: number
): number | null {
  const divisor = 1 - (taxaPlataformaPercentual + margemDesejadaPercentual) / 100;
  if (divisor <= 0) return null;

  const preco = cogsCentavos / divisor;
  return margemDesejadaPercentual > 0 ? Math.ceil(preco) : Math.round(preco);
}

/**
 * Preço de escala: cobre só o custo de caixa (sem depreciação nem mão de obra)
 * mais um lucro fixo desejado por peça, já descontada a taxa estimada da
 * plataforma — `(custoCaixa + lucro) / (1 - taxa)`. Com lucro zero é o preço
 * de "sem perda". Retorna `null` quando a taxa é `>= 100%`.
 */
export function calcularPrecoEscala(
  custoCaixaCentavos: number,
  lucroDesejadoCentavos: number,
  taxaPlataformaPercentual: number
): number | null {
  if (taxaPlataformaPercentual >= 100) return null;

  return Math.round((custoCaixaCentavos + lucroDesejadoCentavos) / (1 - taxaPlataformaPercentual / 100));
}
