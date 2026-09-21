import { describe, expect, it } from "vitest";
import {
  camposTaxasCanaisInvalidos,
  montarTaxasCanaisProduto,
  taxasCanaisParaFormulario,
  VAZIO_TAXAS_CANAIS,
} from "./taxasCanaisFormulario";

describe("taxasCanaisFormulario", () => {
  it("formulário vazio vira objeto vazio (herda tudo do global)", () => {
    expect(montarTaxasCanaisProduto(VAZIO_TAXAS_CANAIS)).toEqual({});
  });

  it("converte percentuais e taxa fixa para centavos, aceitando vírgula", () => {
    expect(
      montarTaxasCanaisProduto({
        shopeeTaxaPercentual: "12,5",
        siteTaxaPercentual: "",
        siteTaxaFixaReais: "0,39",
      })
    ).toEqual({ shopeeTaxaPercentual: 12.5, siteTaxaFixaCentavos: 39 });
  });

  it("volta do produto salvo para o formulário e reabre igual", () => {
    const salvo = { shopeeTaxaPercentual: 20, siteTaxaFixaCentavos: 50 };
    const form = taxasCanaisParaFormulario(salvo);
    expect(form).toEqual({
      shopeeTaxaPercentual: "20",
      siteTaxaPercentual: "",
      siteTaxaFixaReais: "0.50",
    });
    expect(montarTaxasCanaisProduto(form)).toEqual(salvo);
  });

  it("produto sem override volta vazio", () => {
    expect(taxasCanaisParaFormulario(undefined)).toEqual(VAZIO_TAXAS_CANAIS);
  });

  it("aponta campos inválidos", () => {
    expect(camposTaxasCanaisInvalidos(VAZIO_TAXAS_CANAIS)).toEqual([]);
    expect(
      camposTaxasCanaisInvalidos({
        shopeeTaxaPercentual: "100",
        siteTaxaPercentual: "-1",
        siteTaxaFixaReais: "abc",
      })
    ).toHaveLength(3);
  });
});
