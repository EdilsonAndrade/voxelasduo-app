import { describe, expect, it } from "vitest";
import { validarEstoque } from "./estoque";
import type { Produto } from "@/lib/models/produto";

function produto(nome: string, estoque: number): Produto {
  return {
    nome,
    slug: nome.toLowerCase().replace(/\s+/g, "-"),
    descricao: "",
    preco: 1000,
    fotos: [],
    estoque,
    categoria: "decoracao",
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  } as Produto;
}

describe("validarEstoque", () => {
  it("não aponta problemas quando tudo tem estoque suficiente", () => {
    const produtos = new Map([["p1", produto("Vaso", 5)]]);
    expect(validarEstoque(new Map([["p1", 3]]), produtos)).toEqual([]);
  });

  it("acusa produto inexistente com quantidade disponível zero", () => {
    const problemas = validarEstoque(new Map([["fantasma", 1]]), new Map());
    expect(problemas).toEqual([
      { produtoId: "fantasma", nome: "Produto removido", quantidadeDisponivel: 0 },
    ]);
  });

  it("acusa quantidade acima do estoque", () => {
    const produtos = new Map([["p1", produto("Vaso", 2)]]);
    const problemas = validarEstoque(new Map([["p1", 3]]), produtos);
    expect(problemas).toEqual([{ produtoId: "p1", nome: "Vaso", quantidadeDisponivel: 2 }]);
  });

  it("acusa estoque zerado", () => {
    const produtos = new Map([["p1", produto("Vaso", 0)]]);
    expect(validarEstoque(new Map([["p1", 1]]), produtos)).toHaveLength(1);
  });

  it("considera a soma de itens duplicados do mesmo produto", () => {
    const produtos = new Map([["p1", produto("Vaso", 4)]]);
    const problemas = validarEstoque(new Map([["p1", 5]]), produtos);
    expect(problemas[0].quantidadeDisponivel).toBe(4);
  });

  it("reporta vários itens problemáticos de uma vez", () => {
    const produtos = new Map([
      ["p1", produto("Vaso", 1)],
      ["p2", produto("Porta-treco", 10)],
    ]);
    const problemas = validarEstoque(
      new Map([
        ["p1", 2],
        ["p2", 11],
      ]),
      produtos
    );
    expect(problemas).toHaveLength(2);
  });
});
