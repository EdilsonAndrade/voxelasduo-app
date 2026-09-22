import { describe, expect, it } from "vitest";
import {
  camposPrecosCanaisInvalidos,
  montarPrecosCanaisProduto,
  precosCanaisParaFormulario,
  VAZIO_PRECOS_CANAIS,
} from "./precosCanaisFormulario";

describe("precosCanaisFormulario", () => {
  it("formulário vazio vira objeto vazio (herda o preço do site)", () => {
    expect(montarPrecosCanaisProduto(VAZIO_PRECOS_CANAIS)).toEqual({});
  });

  it("converte preços para centavos, aceitando vírgula", () => {
    expect(montarPrecosCanaisProduto({ mercadoLivre: "54,90", shopee: "" })).toEqual({
      mercadoLivre: 5490,
    });
  });

  it("volta do produto salvo para o formulário e reabre igual", () => {
    const salvo = { mercadoLivre: 5490, shopee: 5990 };
    const form = precosCanaisParaFormulario(salvo);
    expect(form).toEqual({ mercadoLivre: "54.90", shopee: "59.90" });
    expect(montarPrecosCanaisProduto(form)).toEqual(salvo);
  });

  it("produto sem override volta vazio", () => {
    expect(precosCanaisParaFormulario(undefined)).toEqual(VAZIO_PRECOS_CANAIS);
  });

  it("aponta campos inválidos (zero, negativo, não numérico)", () => {
    expect(camposPrecosCanaisInvalidos(VAZIO_PRECOS_CANAIS)).toEqual([]);
    expect(camposPrecosCanaisInvalidos({ mercadoLivre: "0", shopee: "-5" })).toHaveLength(2);
    expect(camposPrecosCanaisInvalidos({ mercadoLivre: "abc", shopee: "" })).toHaveLength(1);
  });
});
