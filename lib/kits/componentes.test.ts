import { describe, expect, it } from "vitest";
import type { CustoProducao } from "@/lib/models/produto";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { custoProducaoItemNovo, custoSemEmbalagem, valoresDoComponente } from "./componentes";

const custo: CustoProducao = {
  pesoPecaGramas: 40,
  tempoImpressaoHoras: 2,
  tempoMaoDeObraHoras: 0.5,
  precoCarreteCentavos: 10000,
  pesoCarreteGramas: 1000,
  margemPerdaPercentual: 0,
  precoImpressoraCentavos: 400000,
  vidaUtilImpressoraHoras: 4000,
  consumoEletricoKwh: 0.1,
  tarifaEnergiaCentavos: 100,
  valorHoraTrabalhoCentavos: 2000,
  custoEmbalagemCentavos: 500,
};

describe("valoresDoComponente", () => {
  it("usa preço do site, peso e tempo do custo de produção e custo sem embalagem", () => {
    const valores = valoresDoComponente({ nome: "Árvore", preco: 3000, custoProducao: custo });
    // filamento 400 + depreciação 200 + energia 20 + mão de obra 1000 = 1620 (sem os 500 da embalagem)
    expect(valores).toEqual({ nome: "Árvore", precoCentavos: 3000, pesoGramas: 40, tempoMinutos: 120, custoCentavos: 1620 });
    expect(calcularCustoProducao(custo).totalCentavos).toBe(2120);
  });

  it("sem custo cai na ficha técnica e no Tempo de Impressão; sem nada = não informado", () => {
    expect(valoresDoComponente({ nome: "Estrela", preco: 1500, fichaTecnica: { pesoGramas: 10 } }, 30)).toEqual({
      nome: "Estrela",
      precoCentavos: 1500,
      pesoGramas: 10,
      tempoMinutos: 30,
      custoCentavos: null,
    });
    expect(valoresDoComponente({ nome: "X", preco: 100 })).toMatchObject({ pesoGramas: null, tempoMinutos: null, custoCentavos: null });
  });

  it("taxa de falha continua valendo sobre o custo sem embalagem", () => {
    expect(custoSemEmbalagem({ ...custo, taxaFalhaPercentual: 10 })).toBe(1800);
  });
});

describe("custoProducaoItemNovo", () => {
  it("monta o custo pelo padrão da loja com peso e tempo digitados", () => {
    const novo = custoProducaoItemNovo(25, 90)!;
    expect(novo.pesoPecaGramas).toBe(25);
    expect(novo.tempoImpressaoHoras).toBe(1.5);
    expect(novo.margemPerdaPercentual).toBe(0);
    expect(calcularCustoProducao(novo).totalCentavos).toBeGreaterThan(0);
  });

  it("peso ou tempo inválidos = null", () => {
    expect(custoProducaoItemNovo(0, 90)).toBeNull();
    expect(custoProducaoItemNovo(10, 0)).toBeNull();
  });
});
