import { describe, expect, it } from "vitest";
import {
  camposTaxasCanaisInvalidos,
  montarTaxasCanaisProduto,
  taxasCanaisParaFormulario,
  taxasGlobaisParaPlaceholder,
  VAZIO_TAXAS_CANAIS,
} from "./taxasCanaisFormulario";

describe("taxasCanaisFormulario", () => {
  it("formulário vazio vira objeto vazio (herda tudo do global)", () => {
    expect(montarTaxasCanaisProduto(VAZIO_TAXAS_CANAIS)).toEqual({});
  });

  it("converte percentuais e taxa fixa para centavos, aceitando vírgula", () => {
    expect(
      montarTaxasCanaisProduto({
        ...VAZIO_TAXAS_CANAIS,
        shopeeTaxaPercentual: "12,5",
        siteTaxaFixaReais: "0,39",
      })
    ).toEqual({ shopeeTaxaPercentual: 12.5, siteTaxaFixaCentavos: 39 });
  });

  it("converte o override de margemMinimaPercentual, aceitando vírgula", () => {
    expect(
      montarTaxasCanaisProduto({ ...VAZIO_TAXAS_CANAIS, margemMinimaPercentual: "22,5" })
    ).toEqual({ margemMinimaPercentual: 22.5 });
  });

  it("converte o override de margemDesejadaPercentual, sem teto de 100 (EDI-108)", () => {
    expect(
      montarTaxasCanaisProduto({ ...VAZIO_TAXAS_CANAIS, margemDesejadaPercentual: "40" })
    ).toEqual({ margemDesejadaPercentual: 40 });
    expect(
      montarTaxasCanaisProduto({ ...VAZIO_TAXAS_CANAIS, margemDesejadaPercentual: "300" })
    ).toEqual({ margemDesejadaPercentual: 300 });
  });

  it("volta do produto salvo para o formulário e reabre igual", () => {
    const salvo = {
      shopeeTaxaPercentual: 20,
      siteTaxaFixaCentavos: 50,
      margemMinimaPercentual: 25,
      margemDesejadaPercentual: 40,
    };
    const form = taxasCanaisParaFormulario(salvo);
    expect(form).toEqual({
      shopeeTaxaPercentual: "20",
      siteTaxaPercentual: "",
      siteTaxaFixaReais: "0.50",
      margemMinimaPercentual: "25",
      margemDesejadaPercentual: "40",
    });
    expect(montarTaxasCanaisProduto(form)).toEqual(salvo);
  });

  it("produto sem override volta vazio", () => {
    expect(taxasCanaisParaFormulario(undefined)).toEqual(VAZIO_TAXAS_CANAIS);
  });

  it("aponta campos inválidos, incluindo margem mínima e margem desejada", () => {
    expect(camposTaxasCanaisInvalidos(VAZIO_TAXAS_CANAIS)).toEqual([]);
    expect(
      camposTaxasCanaisInvalidos({
        shopeeTaxaPercentual: "100",
        siteTaxaPercentual: "-1",
        siteTaxaFixaReais: "abc",
        margemMinimaPercentual: "-5",
        margemDesejadaPercentual: "-1",
      })
    ).toHaveLength(5);
  });

  it("margem desejada acima de 100 não é considerada inválida (sem teto)", () => {
    expect(
      camposTaxasCanaisInvalidos({ ...VAZIO_TAXAS_CANAIS, margemDesejadaPercentual: "300" })
    ).toEqual([]);
  });

  it("formata o padrão global (com margens) como placeholder", () => {
    expect(
      taxasGlobaisParaPlaceholder({
        shopeeTaxaPercentual: 14,
        siteTaxaPercentual: 4.99,
        siteTaxaFixaCentavos: 0,
        margemMinimaPercentual: 15,
        margemDesejadaPercentual: 100,
      })
    ).toEqual({
      shopeeTaxaPercentual: "14",
      siteTaxaPercentual: "4.99",
      siteTaxaFixaReais: "0.00",
      margemMinimaPercentual: "15",
      margemDesejadaPercentual: "100",
    });
  });
});
