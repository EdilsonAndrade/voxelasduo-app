import { describe, expect, it } from "vitest";
import { validarImpressora, validarLancamento } from "./validacao";

const ID = "64b7f0c2a1b2c3d4e5f60718";

describe("validarLancamento", () => {
  it("aceita produto do catálogo, cálculo e item digitado", () => {
    const { erros, dados } = validarLancamento({
      data: "2026-11-17",
      meio: "pix",
      cliente: " Ana ",
      taxaCentavos: 0,
      itens: [
        { origem: "produto", produtoId: ID, variacaoId: "k1", nome: "Alce", quantidade: 2, precoUnitarioCentavos: 5000, custoUnitarioCentavos: 1500 },
        { origem: "calculo", calculoId: ID, nome: "Vaso", quantidade: 1, precoUnitarioCentavos: 3000, custoUnitarioCentavos: null },
        { origem: "avulso", nome: "Chaveiro", quantidade: 3, precoUnitarioCentavos: 1000, custoUnitarioCentavos: null, levarParaCalculadora: true },
      ],
    });
    expect(erros).toEqual({});
    expect(dados?.cliente).toBe("Ana");
    expect(dados?.itens[0]).toMatchObject({ produtoId: ID, variacaoId: "k1" });
    expect(dados?.itens[2]).toMatchObject({ origem: "avulso", levarParaCalculadora: true });
  });

  it("recusa sem itens, data, meio, preço zero e produto sem id", () => {
    expect(validarLancamento({ itens: [] }).erros).toMatchObject({
      data: expect.any(String),
      meio: expect.any(String),
      itens: expect.any(String),
    });
    const { erros } = validarLancamento({
      data: "2026-11-17",
      meio: "dinheiro",
      itens: [{ origem: "produto", nome: "X", quantidade: 1, precoUnitarioCentavos: 0, custoUnitarioCentavos: -1 }],
    });
    expect(Object.keys(erros).sort()).toEqual([
      "itens[0].custoUnitarioCentavos",
      "itens[0].precoUnitarioCentavos",
      "itens[0].produtoId",
    ]);
  });
});

describe("validarImpressora", () => {
  it("exige nome, data e valor", () => {
    expect(validarImpressora({ nome: "A1", dataCompra: "2026-01-10", valorCentavos: 300000 }).dados).toEqual({
      nome: "A1",
      dataCompra: "2026-01-10",
      valorCentavos: 300000,
    });
    expect(Object.keys(validarImpressora({}).erros)).toEqual(["nome", "dataCompra", "valorCentavos"]);
  });
});
