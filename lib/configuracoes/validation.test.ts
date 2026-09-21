import { describe, expect, it } from "vitest";
import { validarTaxasCanais } from "./validation";

const valido = { shopeeTaxaPercentual: 14, siteTaxaPercentual: 4.99, siteTaxaFixaCentavos: 0 };

describe("validarTaxasCanais", () => {
  it("aceita um payload válido, inclusive com zeros", () => {
    expect(validarTaxasCanais(valido)).toEqual({});
    expect(validarTaxasCanais({ shopeeTaxaPercentual: 0, siteTaxaPercentual: 0, siteTaxaFixaCentavos: 0 })).toEqual({});
  });

  it("rejeita percentual negativo ou >= 100", () => {
    expect(validarTaxasCanais({ ...valido, shopeeTaxaPercentual: -1 })).toHaveProperty("shopeeTaxaPercentual");
    expect(validarTaxasCanais({ ...valido, siteTaxaPercentual: 100 })).toHaveProperty("siteTaxaPercentual");
  });

  it("rejeita taxa fixa negativa", () => {
    expect(validarTaxasCanais({ ...valido, siteTaxaFixaCentavos: -1 })).toHaveProperty("siteTaxaFixaCentavos");
  });

  it("rejeita campos ausentes ou não numéricos", () => {
    expect(Object.keys(validarTaxasCanais({}))).toHaveLength(3);
    expect(validarTaxasCanais({ ...valido, shopeeTaxaPercentual: "14" })).toHaveProperty("shopeeTaxaPercentual");
    expect(Object.keys(validarTaxasCanais(null))).toHaveLength(3);
  });
});
