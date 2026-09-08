import { describe, expect, it } from "vitest";
import { calcularCustoProducao } from "./custoProducao";
import type { CustoProducao } from "@/lib/models/produto";

// Cenário de referência: mesmos valores usados pelo solicitante para validar a
// funcionalidade (planilha de custos, EDI-92) — COGS total esperado: R$ 29,95.
const custoReferencia: CustoProducao = {
  pesoPecaGramas: 120,
  tempoImpressaoHoras: 4.5,
  tempoMaoDeObraHoras: 0.25,
  precoCarreteCentavos: 10000, // R$ 100,00
  pesoCarreteGramas: 1000,
  margemPerdaPercentual: 10,
  precoImpressoraCentavos: 457000, // R$ 4.570,00
  vidaUtilImpressoraHoras: 4000,
  consumoEletricoKwh: 0.15,
  tarifaEnergiaCentavos: 90, // R$ 0,90/kWh
  valorHoraTrabalhoCentavos: 3000, // R$ 30,00/hora
  custoEmbalagemCentavos: 350, // R$ 3,50
};

describe("calcularCustoProducao", () => {
  it("calcula o COGS e o detalhamento por componente para o cenário de referência", () => {
    const resultado = calcularCustoProducao(custoReferencia);

    expect(resultado.custoFilamentoCentavos).toBe(1320); // 120g * R$0,10/g * 1,10 (perda)
    expect(resultado.custoDepreciacaoCentavos).toBe(514); // 4,5h * (457000/4000)
    expect(resultado.custoEnergiaCentavos).toBe(61); // 4,5h * 0,15kWh * 90 centavos
    expect(resultado.custoMaoDeObraCentavos).toBe(750); // 0,25h * 3000 centavos
    expect(resultado.custoEmbalagemCentavos).toBe(350);
    expect(resultado.totalCentavos).toBe(2995); // R$ 29,95
  });

  it("ignora a margem de perda quando ela é zero", () => {
    const resultado = calcularCustoProducao({ ...custoReferencia, margemPerdaPercentual: 0 });
    expect(resultado.custoFilamentoCentavos).toBe(1200); // sem os 10% de perda
  });

  it("soma exatamente o detalhamento no total, sem desvio de arredondamento", () => {
    const resultado = calcularCustoProducao(custoReferencia);
    const somaComponentes =
      resultado.custoFilamentoCentavos +
      resultado.custoDepreciacaoCentavos +
      resultado.custoEnergiaCentavos +
      resultado.custoMaoDeObraCentavos +
      resultado.custoEmbalagemCentavos;
    expect(resultado.totalCentavos).toBe(somaComponentes);
  });

  it("calcula custo zero para tempo de impressão e mão de obra zerados, mantendo filamento e embalagem", () => {
    const resultado = calcularCustoProducao({
      ...custoReferencia,
      tempoImpressaoHoras: 0,
      tempoMaoDeObraHoras: 0,
    });
    expect(resultado.custoDepreciacaoCentavos).toBe(0);
    expect(resultado.custoEnergiaCentavos).toBe(0);
    expect(resultado.custoMaoDeObraCentavos).toBe(0);
    expect(resultado.custoFilamentoCentavos).toBe(1320);
    expect(resultado.custoEmbalagemCentavos).toBe(350);
  });
});
