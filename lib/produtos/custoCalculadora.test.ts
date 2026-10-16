import { describe, expect, it } from "vitest";
import type { ImpressaoCalculadora } from "@/lib/models/calculoPreco";
import { IMPRESSAO_PADRAO } from "./calculadoraValores";
import { calcularCustoUnidade, camposFaltandoCusto, paraCustoProducao } from "./custoCalculadora";
import { calcularCustoProducao } from "./custoProducao";

function impressao(parcial: Partial<ImpressaoCalculadora> = {}): ImpressaoCalculadora {
  return {
    ...IMPRESSAO_PADRAO,
    consumoKwh: "0.11",
    tarifaEnergiaReais: "1.20",
    precoImpressoraReais: "",
    pecasPorMesa: "1",
    tempoHoras: "1",
    tempoMinutos: "30",
    perdaPercentual: "0",
    taxaFalhaPercentual: "2",
    pesoGramas: "41",
    precoKgReais: "80",
    embalagemReais: "",
    ...parcial,
  };
}

describe("calcularCustoUnidade", () => {
  it("bate com o exemplo do curso: material 3,28, energia 0,20, falha 0,07", () => {
    const c = calcularCustoUnidade(impressao())!;
    expect(c.materialCentavos).toBe(328);
    // 1,5 h × 0,11 kWh × R$ 1,20 = R$ 0,198
    expect(c.energiaCentavos).toBe(20);
    expect(c.desgasteCentavos).toBe(0);
    // 2% de 3,48
    expect(c.falhaCentavos).toBe(7);
    expect(c.totalCentavos).toBe(355);
  });

  it("divide material, energia e desgaste pelas peças da mesa", () => {
    const c = calcularCustoUnidade(
      impressao({ pecasPorMesa: "4", pesoGramas: "100", precoKgReais: "100", taxaFalhaPercentual: "0", precoImpressoraReais: "4000", vidaUtilHoras: "4000", tempoHoras: "2", tempoMinutos: "" })
    )!;
    expect(c.materialCentavos).toBe(250);
    // R$ 1/h × 2 h ÷ 4
    expect(c.desgasteCentavos).toBe(50);
  });

  it("lista de filamentos substitui o campo simples", () => {
    const c = calcularCustoUnidade(
      impressao({
        taxaFalhaPercentual: "0",
        filamentos: [
          { nome: "PLA", cor: "branco", pesoGramas: "30", precoKgReais: "100" },
          { nome: "PETG", cor: "preto", pesoGramas: "10", precoKgReais: "200" },
        ],
      })
    )!;
    expect(c.materialCentavos).toBe(500);
    expect(c.pesoMesaGramas).toBe(40);
  });

  it("lista de extras substitui a embalagem simples e separa por categoria", () => {
    const c = calcularCustoUnidade(
      impressao({
        embalagemReais: "9",
        extras: [
          { item: "Caixa", quantidade: "1", precoReais: "1.20", categoria: "embalagem" },
          { item: "Etiqueta", quantidade: "2", precoReais: "0.10", categoria: "outros" },
          { item: "Mão de obra", quantidade: "1", precoReais: "3", categoria: "maoDeObra" },
        ],
      })
    )!;
    expect(c.embalagemCentavos).toBe(120);
    expect(c.outrosCentavos).toBe(20);
    expect(c.maoDeObraCentavos).toBe(300);
  });

  it("sem lista vale a embalagem simples", () => {
    expect(calcularCustoUnidade(impressao({ embalagemReais: "1.50" }))!.embalagemCentavos).toBe(150);
  });

  it("aponta o que falta e devolve null", () => {
    const i = impressao({ tempoHoras: "", tempoMinutos: "", pesoGramas: "" });
    expect(camposFaltandoCusto(i)).toEqual(expect.arrayContaining(["tempo de impressão", "peso do filamento"]));
    expect(calcularCustoUnidade(i)).toBeNull();
  });
});

describe("paraCustoProducao", () => {
  it("o produto rascunho fica com o mesmo custo total (± 1 centavo)", () => {
    const i = impressao({
      pecasPorMesa: "3",
      pesoGramas: "120",
      perdaPercentual: "5",
      precoImpressoraReais: "3070",
      vidaUtilHoras: "4000",
      extras: [
        { item: "Caixa", quantidade: "1", precoReais: "1.20", categoria: "embalagem" },
        { item: "Lixa", quantidade: "1", precoReais: "0.50", categoria: "acabamento" },
        { item: "Mão de obra", quantidade: "1", precoReais: "2", categoria: "maoDeObra" },
      ],
    });
    const custo = calcularCustoUnidade(i)!;
    const produto = calcularCustoProducao(paraCustoProducao(i, custo));
    expect(Math.abs(produto.totalCentavos - custo.totalCentavos)).toBeLessThanOrEqual(1);
  });
});
