import { describe, expect, it } from "vitest";
import { calcularPrecoSugerido, calcularSimulacaoPrecificacao } from "./precificacao";

describe("calcularSimulacaoPrecificacao", () => {
  it("calcula lucro líquido e margem quando o preço cobre custo + comissão", () => {
    const resultado = calcularSimulacaoPrecificacao(2995, 1131, 7305, 20);

    expect(resultado.lucroLiquidoCentavos).toBe(7305 - 2995 - 1131);
    expect(resultado.margemPercentual).toBeCloseTo(((7305 - 2995 - 1131) / 7305) * 100, 5);
    expect(resultado.prejuizo).toBe(false);
    expect(resultado.margemBaixa).toBe(false);
  });

  it("sinaliza prejuízo quando o preço não cobre custo + comissão", () => {
    const resultado = calcularSimulacaoPrecificacao(2995, 1131, 3000, 20);

    expect(resultado.lucroLiquidoCentavos).toBeLessThan(0);
    expect(resultado.prejuizo).toBe(true);
  });

  it("sinaliza margem baixa quando a margem fica abaixo do mínimo configurado, sem estar em prejuízo", () => {
    // custo+comissão = 4126; preço 4300 -> lucro 174 -> margem ~4% (< 20% mínimo), sem prejuízo
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
  it("calcula o preço sugerido para o cenário de referência (planilha de custos, EDI-92)", () => {
    // COGS R$29,95, margem desejada 100%, taxa da plataforma 18% -> preço sugerido R$73,05 (mesmo exemplo da planilha do solicitante)
    expect(calcularPrecoSugerido(2995, 100, 18)).toBe(7305);
  });

  it("com margem zero, o preço sugerido cobre apenas o custo e a taxa", () => {
    expect(calcularPrecoSugerido(2995, 0, 18)).toBe(Math.round(2995 / 0.82));
  });

  it("com taxa zero, o preço sugerido é o custo mais a margem, sem ajuste de taxa", () => {
    expect(calcularPrecoSugerido(2995, 100, 0)).toBe(2995 * 2);
  });

  it("retorna null quando a taxa da plataforma é 100% ou mais", () => {
    expect(calcularPrecoSugerido(2995, 100, 100)).toBeNull();
    expect(calcularPrecoSugerido(2995, 100, 150)).toBeNull();
  });
});
