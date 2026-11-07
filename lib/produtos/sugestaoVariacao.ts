import { anuncioCanal, calcularPrecoSugeridoCanal, comissaoCanal, type TaxaCanal } from "./canais";
import { arredondarPara90Acima } from "./precoLista";
import { cupomLojaReal, type CupomLoja } from "./verbaDesconto";

/** Taxas e margens da loja usadas no preço sugerido da variação de kit (serializável para o cliente). */
export interface ConfigSugestaoVariacao {
  site: TaxaCanal;
  shopee: TaxaCanal;
  mercadoLivre: TaxaCanal;
  /** Margem desejada (% do preço) — site e Mercado Livre, que vendem sem desconto. */
  margemDesejadaPercentual: number;
  /** Piso de lucro (% do preço pago) — vale na Shopee depois do cupom e do desconto. */
  margemMinimaPercentual: number;
  /** Cupom de loja da Shopee (o de 3%) — `null` = sem cupom. */
  cupomLoja: CupomLoja | null;
}

export interface SugestaoShopee {
  /** Preço cheio para cadastrar no anúncio (o "de"). */
  cheioCentavos: number;
  descontoPercentual: number;
  cupomLojaCentavos: number;
  descontoCentavos: number;
  /** O que o cliente paga com o desconto + o cupom de loja. */
  pagoCentavos: number;
  /** Lucro sobre o preço pago, já sem a taxa da Shopee da faixa do preço pago. */
  lucroCentavos: number;
  margemPercentual: number;
  /** Preço pago passa de R$ 79,99: a Shopee cobra a taxa fixa maior. */
  acimaDe80: boolean;
}

export interface SugestaoVariacao {
  siteCentavos: number | null;
  mercadoLivreCentavos: number | null;
  shopee: SugestaoShopee | null;
}

function lucroNoPreco(taxa: TaxaCanal, custoCentavos: number, precoCentavos: number): number {
  return precoCentavos - custoCentavos - comissaoCanal(taxa, precoCentavos) - anuncioCanal(taxa, precoCentavos);
}

function simularShopee(
  cheioCentavos: number,
  custoCentavos: number,
  descontoPercentual: number,
  config: ConfigSugestaoVariacao
): SugestaoShopee {
  const cupomLojaCentavos = cupomLojaReal(cheioCentavos, config.cupomLoja);
  const descontoCentavos = Math.round((cheioCentavos * descontoPercentual) / 100);
  const pagoCentavos = cheioCentavos - cupomLojaCentavos - descontoCentavos;
  const lucroCentavos = lucroNoPreco(config.shopee, custoCentavos, pagoCentavos);
  return {
    cheioCentavos,
    descontoPercentual,
    cupomLojaCentavos,
    descontoCentavos,
    pagoCentavos,
    lucroCentavos,
    margemPercentual: pagoCentavos > 0 ? (lucroCentavos / pagoCentavos) * 100 : 0,
    acimaDe80: pagoCentavos > 7999,
  };
}

/**
 * Preço cheio da Shopee que, depois do desconto (relâmpago/promoção, em % do
 * cheio) e do cupom de loja, ainda deixa o piso de lucro sobre o que o cliente
 * paga — com a taxa da faixa do preço pago. Termina em ,90. `null` = não há
 * preço possível (taxa + piso + desconto ≥ 100%).
 */
export function sugerirShopee(
  custoCentavos: number,
  descontoPercentual: number,
  config: ConfigSugestaoVariacao
): SugestaoShopee | null {
  if (!(custoCentavos > 0) || !(descontoPercentual >= 0) || descontoPercentual >= 90) return null;
  const pagoMinimo = calcularPrecoSugeridoCanal(custoCentavos, config.margemMinimaPercentual, config.shopee);
  if (pagoMinimo === null) return null;

  const cupomPercentual = config.cupomLoja?.percentual ?? 0;
  const fator = 1 - (descontoPercentual + cupomPercentual) / 100;
  if (fator <= 0) return null;

  // Ponto de partida pela conta direta; depois sobe de R$ 1 em R$ 1 até o piso
  // valer de verdade (teto do cupom e troca de faixa da Shopee mudam a conta).
  let cheio = arredondarPara90Acima(Math.ceil(pagoMinimo / fator));
  for (let tentativa = 0; tentativa < 500; tentativa += 1) {
    const simulacao = simularShopee(cheio, custoCentavos, descontoPercentual, config);
    if (simulacao.margemPercentual >= config.margemMinimaPercentual - 0.005) return simulacao;
    cheio += 100;
  }
  return null;
}

/** Preço sugerido de cada canal para uma variação com o custo informado. */
export function sugerirPrecosVariacao(
  custoCentavos: number,
  descontoShopeePercentual: number,
  config: ConfigSugestaoVariacao
): SugestaoVariacao {
  if (!(custoCentavos > 0)) return { siteCentavos: null, mercadoLivreCentavos: null, shopee: null };
  const site = calcularPrecoSugeridoCanal(custoCentavos, config.margemDesejadaPercentual, config.site);
  const mercadoLivre = calcularPrecoSugeridoCanal(custoCentavos, config.margemDesejadaPercentual, config.mercadoLivre);
  return {
    siteCentavos: site === null ? null : arredondarPara90Acima(site),
    mercadoLivreCentavos: mercadoLivre === null ? null : arredondarPara90Acima(mercadoLivre),
    shopee: sugerirShopee(custoCentavos, descontoShopeePercentual, config),
  };
}
