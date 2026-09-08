import type { CustoProducao } from "@/lib/models/produto";

/** Detalhamento e total do custo de produção (COGS) de uma peça, em centavos (EDI-92). */
export interface ResultadoCogs {
  custoFilamentoCentavos: number;
  custoEnergiaCentavos: number;
  custoDepreciacaoCentavos: number;
  custoMaoDeObraCentavos: number;
  custoEmbalagemCentavos: number;
  /** Soma de todos os componentes acima. */
  totalCentavos: number;
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

  const totalCentavos =
    custoFilamentoCentavos +
    custoDepreciacaoCentavos +
    custoEnergiaCentavos +
    custoMaoDeObraCentavos +
    custoEmbalagemCentavos;

  return {
    custoFilamentoCentavos,
    custoEnergiaCentavos,
    custoDepreciacaoCentavos,
    custoMaoDeObraCentavos,
    custoEmbalagemCentavos,
    totalCentavos,
  };
}
