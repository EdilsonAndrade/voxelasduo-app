import { describe, expect, it } from "vitest";
import { validarTaxasCanais } from "./validation";

const valido = {
  shopeeTaxaPercentual: 14,
  siteTaxaPercentual: 4.99,
  siteTaxaFixaCentavos: 0,
  margemMinimaPercentual: 15,
  margemDesejadaPercentual: 100,
};

describe("validarTaxasCanais", () => {
  it("aceita um payload válido, inclusive com zeros", () => {
    expect(validarTaxasCanais(valido)).toEqual({});
    expect(
      validarTaxasCanais({
        shopeeTaxaPercentual: 0,
        siteTaxaPercentual: 0,
        siteTaxaFixaCentavos: 0,
        margemMinimaPercentual: 0,
        margemDesejadaPercentual: 0,
      })
    ).toEqual({});
    // margem desejada sem teto — 300% é válido (triplicar o custo)
    expect(validarTaxasCanais({ ...valido, margemDesejadaPercentual: 300 })).toEqual({});
  });

  it("rejeita percentual negativo ou >= 100", () => {
    expect(validarTaxasCanais({ ...valido, shopeeTaxaPercentual: -1 })).toHaveProperty("shopeeTaxaPercentual");
    expect(validarTaxasCanais({ ...valido, siteTaxaPercentual: 100 })).toHaveProperty("siteTaxaPercentual");
    expect(validarTaxasCanais({ ...valido, margemMinimaPercentual: -1 })).toHaveProperty("margemMinimaPercentual");
    expect(validarTaxasCanais({ ...valido, margemMinimaPercentual: 100 })).toHaveProperty("margemMinimaPercentual");
    expect(validarTaxasCanais({ ...valido, margemDesejadaPercentual: -1 })).toHaveProperty("margemDesejadaPercentual");
  });

  it("rejeita taxa fixa negativa", () => {
    expect(validarTaxasCanais({ ...valido, siteTaxaFixaCentavos: -1 })).toHaveProperty("siteTaxaFixaCentavos");
  });

  it("rejeita campos ausentes ou não numéricos", () => {
    expect(Object.keys(validarTaxasCanais({}))).toHaveLength(5);
    expect(validarTaxasCanais({ ...valido, shopeeTaxaPercentual: "14" })).toHaveProperty("shopeeTaxaPercentual");
    expect(Object.keys(validarTaxasCanais(null))).toHaveLength(5);
  });
});
