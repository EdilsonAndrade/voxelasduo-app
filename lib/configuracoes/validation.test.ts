import { describe, expect, it } from "vitest";
import { validarTaxasCanais } from "./validation";

const valido = {
  shopeeTaxaPercentual: 14,
  siteTaxaPercentual: 4.99,
  siteTaxaFixaCentavos: 0,
  margemMinimaPercentual: 25,
  margemDesejadaPercentual: 40,
  cupomLojaPercentual: 3,
  cupomLojaTetoCentavos: 500,
  cupomLojaCestaMinimaCentavos: 1000,
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
        cupomLojaPercentual: 0,
        cupomLojaTetoCentavos: null,
        cupomLojaCestaMinimaCentavos: 0,
      })
    ).toEqual({});
  });

  it("rejeita percentual negativo ou >= 100", () => {
    expect(validarTaxasCanais({ ...valido, shopeeTaxaPercentual: -1 })).toHaveProperty("shopeeTaxaPercentual");
    expect(validarTaxasCanais({ ...valido, siteTaxaPercentual: 100 })).toHaveProperty("siteTaxaPercentual");
    expect(validarTaxasCanais({ ...valido, margemMinimaPercentual: -1 })).toHaveProperty("margemMinimaPercentual");
    expect(validarTaxasCanais({ ...valido, margemDesejadaPercentual: -1 })).toHaveProperty("margemDesejadaPercentual");
    // margens são % do preço: 100% ou mais não existe
    expect(validarTaxasCanais({ ...valido, margemDesejadaPercentual: 100 })).toHaveProperty("margemDesejadaPercentual");
    expect(validarTaxasCanais({ ...valido, margemMinimaPercentual: 115 })).toHaveProperty("margemMinimaPercentual");
  });

  it("valida o cupom de loja (teto null = sem limite)", () => {
    expect(validarTaxasCanais({ ...valido, cupomLojaTetoCentavos: null })).toEqual({});
    expect(validarTaxasCanais({ ...valido, cupomLojaPercentual: 100 })).toHaveProperty("cupomLojaPercentual");
    expect(validarTaxasCanais({ ...valido, cupomLojaTetoCentavos: -1 })).toHaveProperty("cupomLojaTetoCentavos");
    expect(validarTaxasCanais({ ...valido, cupomLojaCestaMinimaCentavos: -1 })).toHaveProperty("cupomLojaCestaMinimaCentavos");
  });

  it("rejeita taxa fixa negativa", () => {
    expect(validarTaxasCanais({ ...valido, siteTaxaFixaCentavos: -1 })).toHaveProperty("siteTaxaFixaCentavos");
  });

  it("rejeita campos ausentes ou não numéricos", () => {
    expect(Object.keys(validarTaxasCanais({}))).toHaveLength(8);
    expect(validarTaxasCanais({ ...valido, shopeeTaxaPercentual: "14" })).toHaveProperty("shopeeTaxaPercentual");
    expect(Object.keys(validarTaxasCanais(null))).toHaveLength(8);
  });
});
