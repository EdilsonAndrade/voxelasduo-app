import { describe, expect, it } from "vitest";
import { calcularPrecoEscala, calcularPrecoSugerido, calcularSimulacaoPrecificacao } from "./precificacao";

describe("calcularSimulacaoPrecificacao", () => {
  it("calcula lucro líquido e margem quando o preço cobre custo + comissão", () => {
    const resultado = calcularSimulacaoPrecificacao(2995, 1131, 7305, 20);

    expect(resultado.lucroLiquidoCentavos).toBe(7305 - 2995 - 1131);
    expect(resultado.margemPercentual).toBeCloseTo(((7305 - 2995 - 1131) / 7305) * 100, 5);
    expect(resultado.markupPercentual).toBeCloseTo(((7305 - 2995 - 1131) / 2995) * 100, 5);
    expect(resultado.prejuizo).toBe(false);
    expect(resultado.margemBaixa).toBe(false);
  });

  it("sinaliza prejuízo quando o preço não cobre custo + comissão", () => {
    const resultado = calcularSimulacaoPrecificacao(2995, 1131, 3000, 20);

    expect(resultado.lucroLiquidoCentavos).toBeLessThan(0);
    expect(resultado.prejuizo).toBe(true);
  });

  it("sinaliza margem baixa quando a margem fica abaixo do mínimo configurado, sem estar em prejuízo", () => {
    // custo+comissão = 4126; preço 4300 -> lucro 174 -> ~4% do preço (< 20% mínimo), sem prejuízo
    const resultado = calcularSimulacaoPrecificacao(2995, 1131, 4300, 20);

    expect(resultado.prejuizo).toBe(false);
    expect(resultado.margemBaixa).toBe(true);
  });

  it("não sinaliza margem baixa quando a margem está acima do mínimo configurado", () => {
    const resultado = calcularSimulacaoPrecificacao(2995, 1131, 10000, 20);
    expect(resultado.margemBaixa).toBe(false);
  });
});

describe("calcularPrecoSugerido", () => {
  it("a margem desejada é % do preço: COGS R$29,95, margem 40%, taxa 18% -> R$71,31", () => {
    const preco = calcularPrecoSugerido(2995, 40, 18)!;
    expect(preco).toBe(7131);
    const lucro = preco - Math.round((preco * 18) / 100) - 2995;
    expect(lucro / preco).toBeGreaterThanOrEqual(0.3999);
  });

  it("com margem zero, o preço sugerido cobre apenas o custo e a taxa", () => {
    expect(calcularPrecoSugerido(2995, 0, 18)).toBe(Math.round(2995 / 0.82));
  });

  it("com taxa zero e margem 50%, o preço é o dobro do custo", () => {
    expect(calcularPrecoSugerido(2995, 50, 0)).toBe(2995 * 2);
  });

  it("retorna null quando taxa + margem chega a 100% ou mais", () => {
    expect(calcularPrecoSugerido(2995, 82, 18)).toBeNull();
    expect(calcularPrecoSugerido(2995, 100, 0)).toBeNull();
    expect(calcularPrecoSugerido(2995, 10, 150)).toBeNull();
  });
});

describe("calcularPrecoEscala", () => {
  it("com lucro zero, cobre apenas o custo de caixa e a taxa (sem perda)", () => {
    expect(calcularPrecoEscala(849, 0, 12.5)).toBe(Math.round(849 / 0.875));
  });

  it("soma o lucro fixo desejado antes de aplicar a taxa da plataforma", () => {
    // (849 + 300) / 0,875 = 1313,14
    expect(calcularPrecoEscala(849, 300, 12.5)).toBe(1313);
  });

  it("retorna null quando a taxa da plataforma é 100% ou mais", () => {
    expect(calcularPrecoEscala(849, 300, 100)).toBeNull();
  });
});
