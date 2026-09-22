import type { CustoProducao } from "@/lib/models/produto";

/** Detalhamento e total do custo de produção (COGS) de uma peça, em centavos (EDI-92). */
export interface ResultadoCogs {
  custoFilamentoCentavos: number;
  custoEnergiaCentavos: number;
  custoDepreciacaoCentavos: number;
  custoMaoDeObraCentavos: number;
  custoEmbalagemCentavos: number;
  /** Custo de acessórios/componentes comprados (ex: luz de LED) — 0 quando ausente (EDI-108). */
  custoAcessoriosCentavos: number;
  /** Custo extra das peças perdidas: (soma dos componentes ÷ (1 − falha)) − soma. Zero sem taxa de falha (EDI-106). */
  custoFalhaCentavos: number;
  /** Taxa de falha usada no cálculo (0 quando ausente). */
  taxaFalhaPercentual: number;
  /** Soma de todos os componentes acima — já é o custo por peça boa. */
  totalCentavos: number;
}

/**
 * Custo de caixa de uma peça: só o que sai do bolso a cada venda (filamento,
 * energia e embalagem). Ignora a depreciação da impressora e a mão de obra —
 * base do "preço de escala", para vender sem perda enquanto a impressora
 * estaria ociosa.
 */
export function calcularCustoCaixa(cogs: ResultadoCogs): number {
  const caixa =
    cogs.custoFilamentoCentavos +
    cogs.custoEnergiaCentavos +
    cogs.custoEmbalagemCentavos +
    cogs.custoAcessoriosCentavos;
  return aplicarTaxaFalha(caixa, cogs.taxaFalhaPercentual);
}

/**
 * Custo médio por peça boa: `custo ÷ (1 − falha)` (EDI-106). Sem falha (0 ou
 * inválida) devolve o custo intacto; falha `>= 100%` também, por não haver
 * peça boa — a validação impede esse valor na entrada.
 */
export function aplicarTaxaFalha(custoCentavos: number, taxaFalhaPercentual: number): number {
  if (!(taxaFalhaPercentual > 0) || taxaFalhaPercentual >= 100) return custoCentavos;
  return Math.round(custoCentavos / (1 - taxaFalhaPercentual / 100));
}

/**
 * Calcula o custo de produção (COGS) a partir dos dados de impressão 3D do
 * produto (research.md #4) — função pura, sem I/O, para permitir recálculo
 * instantâneo no cliente a cada alteração de campo (FR-002/FR-003). Cada
 * componente é arredondado individualmente para centavos antes da soma, para
 * que o total exibido bata exatamente com a soma do detalhamento mostrado ao
 * usuário.
 */
export function calcularCustoProducao(custo: CustoProducao): ResultadoCogs {
  const custoFilamentoPorGramaCentavos = custo.precoCarreteCentavos / custo.pesoCarreteGramas;
  const custoFilamentoCentavos = Math.round(
    custo.pesoPecaGramas * custoFilamentoPorGramaCentavos * (1 + custo.margemPerdaPercentual / 100)
  );

  const depreciacaoPorHoraCentavos = custo.precoImpressoraCentavos / custo.vidaUtilImpressoraHoras;
  const custoDepreciacaoCentavos = Math.round(custo.tempoImpressaoHoras * depreciacaoPorHoraCentavos);

  const custoEnergiaCentavos = Math.round(
    custo.tempoImpressaoHoras * custo.consumoEletricoKwh * custo.tarifaEnergiaCentavos
  );

  const custoMaoDeObraCentavos = Math.round(custo.tempoMaoDeObraHoras * custo.valorHoraTrabalhoCentavos);

  const custoEmbalagemCentavos = Math.round(custo.custoEmbalagemCentavos);
  const custoAcessoriosCentavos = Math.round(custo.custoAcessoriosCentavos ?? 0);

  const taxaFalhaPercentual = custo.taxaFalhaPercentual ?? 0;
  const subtotalCentavos =
    custoFilamentoCentavos +
    custoDepreciacaoCentavos +
    custoEnergiaCentavos +
    custoMaoDeObraCentavos +
    custoEmbalagemCentavos +
    custoAcessoriosCentavos;
  const custoFalhaCentavos = aplicarTaxaFalha(subtotalCentavos, taxaFalhaPercentual) - subtotalCentavos;
  const totalCentavos = subtotalCentavos + custoFalhaCentavos;

  return {
    custoFilamentoCentavos,
    custoEnergiaCentavos,
    custoDepreciacaoCentavos,
    custoMaoDeObraCentavos,
    custoEmbalagemCentavos,
    custoAcessoriosCentavos,
    custoFalhaCentavos,
    taxaFalhaPercentual,
    totalCentavos,
  };
}
