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
});
