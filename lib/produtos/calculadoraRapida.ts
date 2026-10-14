import { calcularPrecoSugeridoCanal, type TaxaCanal } from "@/lib/produtos/canais";

/** Capacidade de produção a partir da mesa de impressão cheia. */
export interface ProducaoMensal {
  /** Mesas completas que cabem nas horas trabalhadas do dia (só mesa inteira conta). */
  mesasPorDia: number;
  pecasPorDia: number;
  pecasPorMes: number;
}

/**
 * Quantas peças saem por dia e por mês: `⌊horasDia ÷ horasMesa⌋` mesas por dia,
 * cada uma com `pecasPorMesa` peças. Entradas inválidas (zero/negativas) → `null`.
 */
export function calcularProducaoMensal(entrada: {
  pecasPorMesa: number;
  horasMesaCheia: number;
  horasPorDia: number;
  diasPorMes: number;
}): ProducaoMensal | null {
  const { pecasPorMesa, horasMesaCheia, horasPorDia, diasPorMes } = entrada;
  if (!(pecasPorMesa > 0) || !(horasMesaCheia > 0) || !(horasPorDia > 0) || !(diasPorMes > 0)) {
    return null;
  }

  const mesasPorDia = Math.floor(horasPorDia / horasMesaCheia);
  const pecasPorDia = mesasPorDia * Math.floor(pecasPorMesa);
  return { mesasPorDia, pecasPorDia, pecasPorMes: Math.floor(pecasPorDia * diasPorMes) };
}

/** Preço de um marketplace com anúncio pago, e o que sobra de cada venda. */
export interface ResultadoCanalCalculadora {
  /** `null` quando taxa + anúncio somam 100% ou mais (não existe preço que feche a conta). */
  precoCentavos: number | null;
  taxaCentavos: number;
  anuncioCentavos: number;
  lucroCentavos: number;
  brutoMesCentavos: number;
  lucroMesCentavos: number;
}

/**
 * Mesma fórmula do preço sugerido do cadastro de produto
 * (`(custo × (1 + margem) + taxaFixa) / (1 − taxa%)`), com o percentual do
 * anúncio pago somado à taxa do canal — assim o anúncio sai do preço e a margem
 * desejada sobre o custo fica garantida.
 */
export function calcularCanalCalculadora(entrada: {
  custoCentavos: number;
  margemDesejadaPercentual: number;
  taxa: TaxaCanal;
  anuncioPercentual: number;
  pecasPorMes: number;
}): ResultadoCanalCalculadora {
  const { custoCentavos, margemDesejadaPercentual, taxa, anuncioPercentual, pecasPorMes } = entrada;
  const precoCentavos = calcularPrecoSugeridoCanal(custoCentavos, margemDesejadaPercentual, {
    percentual: taxa.percentual + anuncioPercentual,
    fixaCentavos: taxa.fixaCentavos,
  });

  if (precoCentavos === null) {
    return {
      precoCentavos: null,
      taxaCentavos: 0,
      anuncioCentavos: 0,
      lucroCentavos: 0,
      brutoMesCentavos: 0,
      lucroMesCentavos: 0,
    };
  }

  const taxaCentavos = Math.round((precoCentavos * taxa.percentual) / 100) + taxa.fixaCentavos;
  const anuncioCentavos = Math.round((precoCentavos * anuncioPercentual) / 100);
  const lucroCentavos = precoCentavos - taxaCentavos - anuncioCentavos - custoCentavos;
  const pecas = Math.max(0, Math.floor(pecasPorMes));

  return {
    precoCentavos,
    taxaCentavos,
    anuncioCentavos,
    lucroCentavos,
    brutoMesCentavos: precoCentavos * pecas,
    lucroMesCentavos: lucroCentavos * pecas,
  };
}

/** Quanto do preço pode ir para anúncio (Ads) sem o lucro cair abaixo da margem mínima. */
export interface LimiteAnuncio {
  /** Preço − taxa da plataforma − custo da peça: o que sobra antes de pagar anúncio. */
  sobraCentavos: number;
  /** Margem mínima aplicada sobre o preço de venda. */
  lucroMinimoCentavos: number;
  /** Máximo de anúncio por venda mantendo a margem mínima — negativo = não cabe anúncio. */
  tetoAnuncioCentavos: number;
  /** Meta de ROAS para a campanha (preço ÷ teto) — `null` quando não cabe anúncio. */
  roasMinimo: number | null;
  /** Abaixo deste ROAS a venda pelo anúncio dá prejuízo (preço ÷ sobra) — `null` quando já não sobra nada. */
  roasPrejuizo: number | null;
}

/**
 * Teto de anúncio e metas de ROAS de um canal (mesma conta da central do
 * Shopee Ads: ROAS mínimo = 1 ÷ margem que sobra para o anúncio). A margem
 * mínima aqui é sobre o preço de venda, como os marketplaces medem.
 */
export function calcularLimiteAnuncio(entrada: {
  precoCentavos: number;
  taxaCentavos: number;
  custoCentavos: number;
  margemMinimaPrecoPercentual: number;
}): LimiteAnuncio {
  const { precoCentavos, taxaCentavos, custoCentavos, margemMinimaPrecoPercentual } = entrada;
  const sobraCentavos = precoCentavos - taxaCentavos - custoCentavos;
  const lucroMinimoCentavos = Math.round((precoCentavos * margemMinimaPrecoPercentual) / 100);
  const tetoAnuncioCentavos = sobraCentavos - lucroMinimoCentavos;

  return {
    sobraCentavos,
    lucroMinimoCentavos,
    tetoAnuncioCentavos,
    roasMinimo: tetoAnuncioCentavos > 0 ? precoCentavos / tetoAnuncioCentavos : null,
    roasPrejuizo: sobraCentavos > 0 ? precoCentavos / sobraCentavos : null,
  };
}
