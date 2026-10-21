import { describe, expect, it } from "vitest";
import { centavosParaCampo, reaisParaCentavos, textoParaPercentual } from "./formato";

describe("reaisParaCentavos", () => {
  it.each([
    ["12,50", 1250],
    ["12.5", 1250],
    ["R$ 1.234,56", 123456],
    ["0", 0],
  ])("%s → %d", (texto, esperado) => {
    expect(reaisParaCentavos(texto)).toBe(esperado);
  });

  it("vazio, texto e negativo viram null", () => {
    expect(reaisParaCentavos("")).toBeNull();
    expect(reaisParaCentavos("abc")).toBeNull();
    expect(reaisParaCentavos("-3")).toBeNull();
  });
});

describe("centavosParaCampo / textoParaPercentual", () => {
  it("formata com vírgula e lê percentual com vírgula ou ponto", () => {
    expect(centavosParaCampo(1250)).toBe("12,50");
    expect(centavosParaCampo(null)).toBe("");
    expect(textoParaPercentual("4,99")).toBe(4.99);
    expect(textoParaPercentual("14%")).toBe(14);
    expect(textoParaPercentual("")).toBeNull();
  });
});
