import { describe, expect, it } from "vitest";
import { centavosParaReais, reaisParaCentavos } from "./conversao";

describe("centavosParaReais", () => {
  it("converte centavos inteiros para reais", () => {
    expect(centavosParaReais(4990)).toBe(49.9);
  });

  it("converte zero", () => {
    expect(centavosParaReais(0)).toBe(0);
  });

  it("arredonda centavos fracionários antes de converter", () => {
    expect(centavosParaReais(4990.4)).toBe(49.9);
  });
});

describe("reaisParaCentavos", () => {
  it("converte reais para centavos inteiros", () => {
    expect(reaisParaCentavos(49.9)).toBe(4990);
  });

  it("evita erro de ponto flutuante (ex: 0.1 + 0.2)", () => {
    expect(reaisParaCentavos(19.9)).toBe(1990);
  });

  it("é o inverso de centavosParaReais para valores em centavos", () => {
    const centavos = 12345;
    expect(reaisParaCentavos(centavosParaReais(centavos))).toBe(centavos);
  });
});
