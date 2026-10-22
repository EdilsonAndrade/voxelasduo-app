import { describe, expect, it } from "vitest";
import { TAXAS_CANAIS_PADRAO } from "@/lib/models/configuracao";
import { comissaoCanal, resolverTaxasCanais } from "./canais";
import { calcularVerbaDesconto, cupomLojaReal, simularDesconto } from "./verbaDesconto";

const shopee = resolverTaxasCanais(TAXAS_CANAIS_PADRAO).shopee;
const lucroShopee = (custo: number) => (preco: number) => preco - comissaoCanal(shopee, preco) - custo;
const cupom3 = { percentual: 3, tetoCentavos: null };

describe("cupomLojaReal", () => {
  it("aplica o % sobre o preço", () => {
    expect(cupomLojaReal(2599, cupom3)).toBe(78);
  });

  it("respeita o teto: 3% de R$ 300 com máximo de R$ 5 = R$ 5", () => {
    expect(cupomLojaReal(30000, { percentual: 3, tetoCentavos: 500 })).toBe(500);
  });

  it("sem cupom ou com 0% não desconta nada", () => {
    expect(cupomLojaReal(30000, null)).toBe(0);
    expect(cupomLojaReal(30000, { percentual: 0, tetoCentavos: null })).toBe(0);
  });
});

describe("calcularVerbaDesconto", () => {
  it("exemplo do curso: suporte de óculos R$ 25,99, custo R$ 5,15 → 42,9% − 25% − 3% = 14,9% de sobra", () => {
    const verba = calcularVerbaDesconto({ precoCentavos: 2599, pisoPercentual: 25, cupomLoja: cupom3, lucroEm: lucroShopee(515) });
    expect(verba.lucroCentavos).toBe(1114);
    expect(verba.margemPercentual).toBeCloseTo(42.9, 1);
    expect(verba.verbaPercentual).toBeCloseTo(17.9, 1);
    expect(verba.cupomLojaPercentual).toBeCloseTo(3, 1);
    expect(verba.sobraPercentual).toBeCloseTo(14.9, 1);
    expect(verba.estado).toBe("ok");
  });

  it("com teto, produto caro gasta menos verba com o cupom de loja", () => {
    const verba = calcularVerbaDesconto({
      precoCentavos: 30000,
      pisoPercentual: 25,
      cupomLoja: { percentual: 3, tetoCentavos: 500 },
      lucroEm: lucroShopee(10000),
    });
    expect(verba.cupomLojaCentavos).toBe(500);
    expect(verba.cupomLojaPercentual).toBeCloseTo(1.67, 2);
  });

  it("sem cupom de loja a sobra é a verba inteira", () => {
    const verba = calcularVerbaDesconto({ precoCentavos: 2599, pisoPercentual: 25, cupomLoja: null, lucroEm: lucroShopee(515) });
    expect(verba.sobraPercentual).toBeCloseTo(verba.verbaPercentual, 10);
  });

  it("margem de 26% com piso 25% e cupom 3%: não cabe o cupom de loja", () => {
    const verba = calcularVerbaDesconto({ precoCentavos: 10000, pisoPercentual: 25, cupomLoja: cupom3, lucroEm: () => 2600 });
    expect(verba.estado).toBe("semCupomLoja");
    expect(verba.sobraPercentual).toBeCloseTo(-2, 5);
  });

  it("margem abaixo do piso", () => {
    const verba = calcularVerbaDesconto({ precoCentavos: 10000, pisoPercentual: 25, cupomLoja: cupom3, lucroEm: () => 2000 });
    expect(verba.estado).toBe("abaixoDoPiso");
    expect(verba.verbaPercentual).toBeCloseTo(-5, 5);
  });
});

describe("simularDesconto", () => {
  const lucroEm = lucroShopee(515);
  const verba = calcularVerbaDesconto({ precoCentavos: 2599, pisoPercentual: 25, cupomLoja: cupom3, lucroEm });

  it("dar a sobra inteira mantém o lucro acima do piso (a regra é conservadora)", () => {
    const simulacao = simularDesconto(verba, verba.sobraPercentual, lucroEm)!;
    expect(simulacao.passouDaSobra).toBe(false);
    expect(simulacao.abaixoDoPiso).toBe(false);
    expect(simulacao.margemPercentual).toBeGreaterThan(25);
    // e também acima de 25% do preço cheio
    expect(simulacao.lucroCentavos / 2599).toBeGreaterThan(0.25);
  });

  it("o cupom de loja e o desconto se somam e as taxas são recalculadas no preço final", () => {
    const simulacao = simularDesconto(verba, 10, lucroEm)!;
    expect(simulacao.precoFinalCentavos).toBe(2599 - 78 - 260);
    expect(simulacao.lucroCentavos).toBe(2261 - comissaoCanal(shopee, 2261) - 515);
  });

  it("desconto maior que a sobra é sinalizado", () => {
    expect(simularDesconto(verba, 20, lucroEm)!.passouDaSobra).toBe(true);
  });

  it("muda de faixa da Shopee quando o preço final cai abaixo de R$ 100", () => {
    const lucroCalendario = lucroShopee(5957);
    const v = calcularVerbaDesconto({ precoCentavos: 10500, pisoPercentual: 0, cupomLoja: null, lucroEm: lucroCalendario });
    const simulacao = simularDesconto(v, 10, lucroCalendario)!;
    expect(simulacao.precoFinalCentavos).toBe(9450);
    // 14% + R$ 16 na faixa de R$ 80 a R$ 99,99
    expect(simulacao.lucroCentavos).toBe(9450 - (Math.round(9450 * 0.14) + 1600) - 5957);
  });

  it("rejeita desconto inválido", () => {
    expect(simularDesconto(verba, -1, lucroEm)).toBeNull();
    expect(simularDesconto(verba, 100, lucroEm)).toBeNull();
    expect(simularDesconto(verba, Number.NaN, lucroEm)).toBeNull();
  });
});
