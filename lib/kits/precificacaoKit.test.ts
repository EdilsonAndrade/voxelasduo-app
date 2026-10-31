import { describe, expect, it } from "vitest";
import { TAXAS_CANAIS_PADRAO } from "@/lib/models/configuracao";
import type { ValoresComponente } from "@/lib/models/kit";
import {
  avaliarPreco,
  calcularTotaisKit,
  canaisDoKit,
  margensNoPreco,
  precoSugeridoItemNovo,
  sugerirFaixas,
  valorDoItem,
} from "./precificacaoKit";

const arvore: ValoresComponente = { nome: "Árvore", precoCentavos: 3000, pesoGramas: 40, tempoMinutos: 120, custoCentavos: 800 };
const estrela: ValoresComponente = { nome: "Estrela", precoCentavos: 1500, pesoGramas: 10, tempoMinutos: 30, custoCentavos: 300 };
const canais = canaisDoKit(TAXAS_CANAIS_PADRAO);

describe("calcularTotaisKit", () => {
  it("soma preço, peso, tempo e custo por quantidade, com a embalagem do kit uma vez", () => {
    const totais = calcularTotaisKit(
      [
        { quantidade: 1, valores: arvore },
        { quantidade: 2, valores: estrela },
      ],
      500
    );
    expect(totais).toMatchObject({
      somaAvulsaCentavos: 6000,
      pesoGramas: 60,
      tempoMinutos: 180,
      custoCentavos: 800 + 600 + 500,
      quantidadePecas: 3,
      pesoIncompleto: false,
      tempoIncompleto: false,
      custoIncompleto: false,
    });
  });

  it("sinaliza dados faltando e kit vazio não cobra embalagem", () => {
    const totais = calcularTotaisKit([{ quantidade: 1, valores: { ...estrela, tempoMinutos: null, custoCentavos: null } }], 500);
    expect(totais.tempoIncompleto).toBe(true);
    expect(totais.custoIncompleto).toBe(true);
    expect(calcularTotaisKit([], 500).custoCentavos).toBe(0);
  });
});

describe("sugerirFaixas", () => {
  const totais = calcularTotaisKit([{ quantidade: 1, valores: { ...arvore, precoCentavos: 10000, custoCentavos: 3000 } }], 500);

  it("preço = soma × (1 − desconto), com economia e margem por canal", () => {
    const faixas = sugerirFaixas(totais, [10, 15, 20], canais, 25);
    expect(faixas.map((f) => f.precoCentavos)).toEqual([9000, 8500, 8000]);
    expect(faixas[0].economiaCentavos).toBe(1000);
    expect(faixas[0].margens.map((m) => m.canal)).toEqual(["siteProprio", "shopee", "mercadoLivre"]);
    // Site: 9000 − 3500 − 4,99% (449) = 5051
    expect(faixas[0].margens[0].lucroCentavos).toBe(5051);
    expect(faixas[0].bloqueada).toBe(false);
  });

  it("bloqueia a faixa quando a margem do site fica abaixo do piso", () => {
    const caro = calcularTotaisKit([{ quantidade: 1, valores: { ...arvore, precoCentavos: 10000, custoCentavos: 6500 } }], 0);
    const [faixa] = sugerirFaixas(caro, [20], canais, 25);
    // 8000 − 6500 − 399 = 1101 → 13,8% < 25%
    expect(faixa.bloqueada).toBe(true);
    expect(faixa.margens[0].abaixoDoPiso).toBe(true);
  });

  it("sem itens não sugere nada", () => {
    expect(sugerirFaixas(calcularTotaisKit([], 0), [10], canais, 25)).toEqual([]);
  });
});

describe("avaliarPreco", () => {
  it("avisa quando o kit não sai mais em conta que os avulsos", () => {
    const totais = calcularTotaisKit([{ quantidade: 1, valores: arvore }], 0);
    expect(avaliarPreco(3000, totais, canais, 25).naoEstaEmConta).toBe(true);
    expect(avaliarPreco(2900, totais, canais, 25).naoEstaEmConta).toBe(false);
  });
});

describe("margensNoPreco", () => {
  it("Mercado Livre estimado cobra R$ 6,50 abaixo de R$ 79 e só os 14% acima", () => {
    const [, , mlBarato] = margensNoPreco(5000, 1000, canais, 25);
    const [, , mlCaro] = margensNoPreco(10000, 1000, canais, 25);
    expect(mlBarato.comissaoCentavos).toBe(700 + 650);
    expect(mlCaro.comissaoCentavos).toBe(1400);
  });
});

describe("precoSugeridoItemNovo", () => {
  it("usa a margem desejada da loja e a taxa do site", () => {
    // 1000 / (1 − 0,0499 − 0,40) = 1817,9 → 1818
    expect(precoSugeridoItemNovo(1000, TAXAS_CANAIS_PADRAO)).toBe(1818);
  });
});

describe("margem por item", () => {
  it("valor do item = custo × (1 + margem); sem margem ou sem custo vale o preço avulso", () => {
    expect(valorDoItem(arvore, 50)).toBe(1200);
    expect(valorDoItem(arvore, null)).toBe(3000);
    expect(valorDoItem({ ...arvore, custoCentavos: null }, 50)).toBe(3000);
  });

  it("a soma usada nas faixas de desconto leva a margem de cada item", () => {
    const totais = calcularTotaisKit(
      [
        { quantidade: 2, valores: arvore, margemPercentual: 100 },
        { quantidade: 1, valores: estrela },
      ],
      0
    );
    expect(totais.somaAvulsaCentavos).toBe(1600 * 2 + 1500);
  });
});
