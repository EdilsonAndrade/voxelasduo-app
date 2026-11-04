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

  it("converte o override de margemDesejadaPercentual e ignora valor >= 100 (% do preço)", () => {
    expect(
      montarTaxasCanaisProduto({ ...VAZIO_TAXAS_CANAIS, margemDesejadaPercentual: "40" })
    ).toEqual({ margemDesejadaPercentual: 40 });
    expect(
      montarTaxasCanaisProduto({ ...VAZIO_TAXAS_CANAIS, margemDesejadaPercentual: "300" })
    ).toEqual({});
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
      anuncioAtivo: false,
      anuncioRoasMeta: "8",
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
        ...VAZIO_TAXAS_CANAIS,
        shopeeTaxaPercentual: "100",
        siteTaxaPercentual: "-1",
        siteTaxaFixaReais: "abc",
        margemMinimaPercentual: "-5",
        margemDesejadaPercentual: "-1",
      })
    ).toHaveLength(5);
  });

  it("margem desejada de 100 ou mais é inválida (é % do preço)", () => {
    expect(
      camposTaxasCanaisInvalidos({ ...VAZIO_TAXAS_CANAIS, margemDesejadaPercentual: "115" })
    ).toHaveLength(1);
  });

  it("formata o padrão global (com margens) como placeholder", () => {
    expect(
      taxasGlobaisParaPlaceholder({
        shopeeTaxaPercentual: 14,
        siteTaxaPercentual: 4.99,
        siteTaxaFixaCentavos: 0,
        margemMinimaPercentual: 25,
        margemDesejadaPercentual: 40,
        cupomLojaPercentual: 3,
        cupomLojaTetoCentavos: 500,
        cupomLojaCestaMinimaCentavos: 1000,
      })
    ).toEqual({
      shopeeTaxaPercentual: "14",
      siteTaxaPercentual: "4.99",
      siteTaxaFixaReais: "0.00",
      margemMinimaPercentual: "25",
      margemDesejadaPercentual: "40",
      anuncioAtivo: false,
      anuncioRoasMeta: "8",
    });
  });
});

describe("anúncio pago no formulário (EDI-137)", () => {
  it("desligado com ROAS padrão não grava nada", () => {
    expect(montarTaxasCanaisProduto(VAZIO_TAXAS_CANAIS)).not.toHaveProperty("anuncio");
  });

  it("ligado grava ativo e ROAS; desligado guarda o ROAS digitado", () => {
    expect(montarTaxasCanaisProduto({ ...VAZIO_TAXAS_CANAIS, anuncioAtivo: true, anuncioRoasMeta: "6,5" }).anuncio).toEqual({
      ativo: true,
      roasMeta: 6.5,
    });
    expect(montarTaxasCanaisProduto({ ...VAZIO_TAXAS_CANAIS, anuncioRoasMeta: "5" }).anuncio).toEqual({ ativo: false, roasMeta: 5 });
  });

  it("ligado com ROAS inválido aparece nos campos inválidos", () => {
    expect(camposTaxasCanaisInvalidos({ ...VAZIO_TAXAS_CANAIS, anuncioAtivo: true, anuncioRoasMeta: "0" })).toEqual([
      "ROAS meta do anúncio pago (maior que 0 e até 100)",
    ]);
  });

  it("volta para o formulário como estava", () => {
    expect(taxasCanaisParaFormulario({ anuncio: { ativo: true, roasMeta: 8 } })).toMatchObject({
      anuncioAtivo: true,
      anuncioRoasMeta: "8",
    });
  });
});
