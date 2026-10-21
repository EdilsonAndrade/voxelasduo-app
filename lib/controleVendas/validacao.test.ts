import { describe, expect, it } from "vitest";
import { validarProducao, validarVenda } from "./validacao";

const vendaValida = {
  data: "2026-10-20T12:00:00.000Z",
  quantidade: 1,
  cliente: "Feira de domingo",
  canal: "direta",
  precoUnitarioCentavos: 5000,
  taxaPercentual: 4.99,
  taxaFixaCentavos: 0,
  extrasCentavos: 150,
  baixarEstoque: true,
};

describe("validarProducao", () => {
  it("aceita custo e preço nulos (usa os do cadastro)", () => {
    expect(validarProducao({ produzido: 5, custoUnitarioCentavos: null, precoVendaCentavos: null })).toEqual({});
  });

  it("recusa produzido fracionado e valores negativos", () => {
    const erros = validarProducao({ produzido: 1.5, custoUnitarioCentavos: -1, precoVendaCentavos: null });
    expect(Object.keys(erros).sort()).toEqual(["custoUnitarioCentavos", "produzido"]);
  });
});

describe("validarVenda", () => {
  it("aceita uma venda completa", () => {
    expect(validarVenda(vendaValida)).toEqual({});
  });

  it("aponta cada campo inválido", () => {
    const erros = validarVenda({ ...vendaValida, quantidade: 0, canal: "loja", taxaPercentual: 120, data: "x" });
    expect(Object.keys(erros).sort()).toEqual(["canal", "data", "quantidade", "taxaPercentual"]);
  });

  it("recusa corpo vazio", () => {
    expect(Object.keys(validarVenda(null)).length).toBeGreaterThan(5);
  });
});
