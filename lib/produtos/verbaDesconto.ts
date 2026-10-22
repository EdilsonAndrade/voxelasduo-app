/** Cupom de loja da Shopee (vale para todos os produtos): % do preço com teto opcional em R$. */
export interface CupomLoja {
  percentual: number;
  /** `null` = sem limite. */
  tetoCentavos: number | null;
}

/** Quanto do preço sobra para cupons e promoções acima do piso de lucro (spec 034). */
export interface VerbaDesconto {
  precoCentavos: number;
  lucroCentavos: number;
  /** Lucro em % do preço. */
  margemPercentual: number;
  pisoPercentual: number;
  /** Margem − piso: o espaço total para descontos (negativo = já abaixo do piso). */
  verbaPercentual: number;
  /** Desconto real do cupom de loja neste preço (já com o teto) — 0 sem cupom. */
  cupomLojaCentavos: number;
  cupomLojaPercentual: number;
  /** Verba − cupom de loja: o que fica livre para promoção relâmpago, cupom do produto etc. */
  sobraPercentual: number;
  sobraCentavos: number;
  /** `semCupomLoja` = a verba não cobre nem o cupom de loja; `abaixoDoPiso` = a margem já é menor que o piso. */
  estado: "ok" | "semCupomLoja" | "abaixoDoPiso";
}

/** Desconto real do cupom de loja num preço: `min(preço × %, teto)`. */
export function cupomLojaReal(precoCentavos: number, cupom: CupomLoja | null): number {
  if (!cupom || !(cupom.percentual > 0) || precoCentavos <= 0) return 0;
  const cheio = Math.round((precoCentavos * cupom.percentual) / 100);
  return cupom.tetoCentavos === null ? cheio : Math.min(cheio, cupom.tetoCentavos);
}

/**
 * Verba de desconto pela regra "margem − piso − cupom de loja" (a subtração
 * simples do curso, que é conservadora: dando até a sobra, o lucro fica no
 * piso ou acima, seja medido sobre o preço cheio ou sobre o preço com
 * desconto). `lucroEm` devolve o lucro em centavos num preço — cada tela passa
 * a conta dela (comissão do canal, imposto, anúncio…).
 */
export function calcularVerbaDesconto(entrada: {
  precoCentavos: number;
  pisoPercentual: number;
  cupomLoja: CupomLoja | null;
  lucroEm: (precoCentavos: number) => number;
}): VerbaDesconto {
  const { precoCentavos, pisoPercentual, cupomLoja, lucroEm } = entrada;
  const lucroCentavos = lucroEm(precoCentavos);
  const margemPercentual = precoCentavos > 0 ? (lucroCentavos / precoCentavos) * 100 : 0;
  const verbaPercentual = margemPercentual - pisoPercentual;
  const cupomLojaCentavos = cupomLojaReal(precoCentavos, cupomLoja);
  const cupomLojaPercentual = precoCentavos > 0 ? (cupomLojaCentavos / precoCentavos) * 100 : 0;
  const sobraPercentual = verbaPercentual - cupomLojaPercentual;

  return {
    precoCentavos,
    lucroCentavos,
    margemPercentual,
    pisoPercentual,
    verbaPercentual,
    cupomLojaCentavos,
    cupomLojaPercentual,
    sobraPercentual,
    sobraCentavos: Math.round((precoCentavos * sobraPercentual) / 100),
    estado: verbaPercentual < 0 ? "abaixoDoPiso" : sobraPercentual < 0 ? "semCupomLoja" : "ok",
  };
}

/** Um desconto simulado em cima da verba: o que o cliente paga e quanto sobra de lucro de verdade. */
export interface SimulacaoDesconto {
  descontoPercentual: number;
  descontoCentavos: number;
  /** Preço − cupom de loja − desconto (os cupons da Shopee se somam). */
  precoFinalCentavos: number;
  /** Lucro no preço final, com as taxas recalculadas sobre ele. */
  lucroCentavos: number;
  /** Lucro em % do preço final. */
  margemPercentual: number;
  passouDaSobra: boolean;
  abaixoDoPiso: boolean;
}

/** `null` = desconto inválido (negativo, não numérico ou 100% ou mais). */
export function simularDesconto(
  verba: VerbaDesconto,
  descontoPercentual: number,
  lucroEm: (precoCentavos: number) => number
): SimulacaoDesconto | null {
  if (!Number.isFinite(descontoPercentual) || descontoPercentual < 0 || descontoPercentual >= 100) return null;

  const descontoCentavos = Math.round((verba.precoCentavos * descontoPercentual) / 100);
  const precoFinalCentavos = verba.precoCentavos - verba.cupomLojaCentavos - descontoCentavos;
  const lucroCentavos = lucroEm(precoFinalCentavos);
  const margemPercentual = precoFinalCentavos > 0 ? (lucroCentavos / precoFinalCentavos) * 100 : 0;

  return {
    descontoPercentual,
    descontoCentavos,
    precoFinalCentavos,
    lucroCentavos,
    margemPercentual,
    // Tolerância de arredondamento: dar exatamente a sobra não é "passar".
    passouDaSobra: descontoPercentual > verba.sobraPercentual + 0.005,
    abaixoDoPiso: precoFinalCentavos <= 0 || margemPercentual < verba.pisoPercentual - 0.005,
  };
}
