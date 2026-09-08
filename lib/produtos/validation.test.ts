import { describe, expect, it } from "vitest";
import { validarProduto } from "./validation";

const payloadValido = {
  nome: "Vaso Voronoi",
  descricao: "Vaso decorativo impresso em 3D.",
  preco: 4990,
  estoque: 10,
  categoria: "decoracao",
  fotos: ["https://blob.example/vaso.jpg"],
};

describe("validarProduto", () => {
  it("aceita um payload completo e válido", () => {
    expect(validarProduto(payloadValido)).toEqual({});
  });

  it("rejeita preço zero ou negativo", () => {
    expect(validarProduto({ ...payloadValido, preco: 0 })).toHaveProperty("preco");
    expect(validarProduto({ ...payloadValido, preco: -100 })).toHaveProperty("preco");
  });

  it("rejeita estoque negativo", () => {
    expect(validarProduto({ ...payloadValido, estoque: -1 })).toHaveProperty("estoque");
  });

  it("rejeita campo obrigatório ausente", () => {
    const { nome, ...semNome } = payloadValido;
    void nome;
    expect(validarProduto(semNome)).toHaveProperty("nome");
  });

  it("rejeita fotos vazio", () => {
    expect(validarProduto({ ...payloadValido, fotos: [] })).toHaveProperty("fotos");
  });

  it("no modo parcial, ignora campos ausentes e valida só os presentes", () => {
    expect(validarProduto({ preco: 100 }, { parcial: true })).toEqual({});
    expect(validarProduto({ preco: -1 }, { parcial: true })).toHaveProperty("preco");
  });

  const custoProducaoValido = {
    pesoPecaGramas: 120,
    tempoImpressaoHoras: 4.5,
    tempoMaoDeObraHoras: 0.25,
    precoCarreteCentavos: 10000,
    pesoCarreteGramas: 1000,
    margemPerdaPercentual: 10,
    precoImpressoraCentavos: 457000,
    vidaUtilImpressoraHoras: 4000,
    consumoEletricoKwh: 0.15,
    tarifaEnergiaCentavos: 90,
    valorHoraTrabalhoCentavos: 3000,
    custoEmbalagemCentavos: 350,
  };

  it("aceita produto sem custoProducao (campo opcional)", () => {
    expect(validarProduto(payloadValido)).toEqual({});
  });

  it("aceita custoProducao completo e válido", () => {
    expect(validarProduto({ ...payloadValido, custoProducao: custoProducaoValido })).toEqual({});
  });

  it("aceita margemPerdaPercentual igual a zero", () => {
    expect(
      validarProduto({
        ...payloadValido,
        custoProducao: { ...custoProducaoValido, margemPerdaPercentual: 0 },
      })
    ).toEqual({});
  });

  it("rejeita custoProducao com campo obrigatório ausente", () => {
    const { pesoPecaGramas, ...semPeso } = custoProducaoValido;
    void pesoPecaGramas;
    expect(
      validarProduto({ ...payloadValido, custoProducao: semPeso })
    ).toHaveProperty("custoProducao");
  });

  it("rejeita custoProducao com campo zero ou negativo", () => {
    expect(
      validarProduto({
        ...payloadValido,
        custoProducao: { ...custoProducaoValido, pesoCarreteGramas: 0 },
      })
    ).toHaveProperty("custoProducao");
    expect(
      validarProduto({
        ...payloadValido,
        custoProducao: { ...custoProducaoValido, precoImpressoraCentavos: -1 },
      })
    ).toHaveProperty("custoProducao");
  });

  it("rejeita margemPerdaPercentual negativa", () => {
    expect(
      validarProduto({
        ...payloadValido,
        custoProducao: { ...custoProducaoValido, margemPerdaPercentual: -5 },
      })
    ).toHaveProperty("custoProducao");
  });

  it("rejeita custoProducao em formato inválido", () => {
    expect(validarProduto({ ...payloadValido, custoProducao: "não é objeto" })).toHaveProperty(
      "custoProducao"
    );
  });
});
