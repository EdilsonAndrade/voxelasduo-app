import { describe, expect, it } from "vitest";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { calcularTotaisKit } from "./precificacaoKit";
import { custoProducaoDoKit, descricaoInicialDoKit, itensInclusosDoKit } from "./produtoDoKit";

describe("custoProducaoDoKit", () => {
  it("fecha exatamente o custo do kit e mantém todos os campos > 0", () => {
    const totais = calcularTotaisKit(
      [
        { quantidade: 2, valores: { nome: "Estrela", precoCentavos: 1500, pesoGramas: 10, tempoMinutos: 30, custoCentavos: 900 } },
        { quantidade: 1, valores: { nome: "Árvore", precoCentavos: 3000, pesoGramas: 40, tempoMinutos: 120, custoCentavos: 1600 } },
      ],
      600
    );
    const custo = custoProducaoDoKit(
      totais,
      [
        { nome: "Estrela", quantidade: 2, maoDeObraHoras: 0.5 },
        { nome: "Árvore", quantidade: 1 },
      ],
      600
    );
    expect(calcularCustoProducao(custo).totalCentavos).toBe(totais.custoCentavos);
    expect(custo.pesoPecaGramas).toBe(60);
    expect(custo.tempoImpressaoHoras).toBe(3);
    expect(custo.tempoMaoDeObraHoras).toBe(1);
    expect(custo.custoEmbalagemCentavos).toBe(600);
  });
});

describe("itensInclusosDoKit / descricaoInicialDoKit", () => {
  it("lista com quantidade quando > 1", () => {
    const pecas = [
      { nome: "Estrela", quantidade: 2 },
      { nome: "Árvore", quantidade: 1 },
    ];
    expect(itensInclusosDoKit(pecas)).toEqual(["2× Estrela", "Árvore"]);
    expect(descricaoInicialDoKit("Kit Natal", pecas)).toBe("Kit Natal. O kit inclui:\n• 2× Estrela\n• Árvore");
  });
});
