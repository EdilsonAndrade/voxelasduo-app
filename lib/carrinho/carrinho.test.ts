import { describe, expect, it } from "vitest";
import {
  adicionarItem,
  alterarQuantidade,
  calcularTotais,
  limparCarrinho,
  removerItem,
  type ItemCarrinho,
} from "./carrinho";

function itemBase(sobrescrever: Partial<ItemCarrinho> = {}): ItemCarrinho {
  return {
    produtoId: "p1",
    nome: "Vaso Voronoi",
    foto: "https://blob.example/vaso.jpg",
    categoria: "decoracao",
    slug: "vaso-voronoi",
    preco: 4990,
    estoque: 10,
    quantidade: 1,
    ...sobrescrever,
  };
}

describe("adicionarItem", () => {
  it("adiciona um produto novo com a quantidade informada", () => {
    const itens = adicionarItem([], { ...itemBase(), quantidade: 2 });
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ produtoId: "p1", quantidade: 2 });
  });

  it("soma a quantidade quando o produto já está no carrinho", () => {
    const itens = adicionarItem([itemBase({ quantidade: 2 })], {
      ...itemBase(),
      quantidade: 3,
    });
    expect(itens[0].quantidade).toBe(5);
  });

  it("limita a quantidade ao estoque do produto", () => {
    const itens = adicionarItem([itemBase({ quantidade: 8, estoque: 10 })], {
      ...itemBase(),
      quantidade: 5,
    });
    expect(itens[0].quantidade).toBe(10);
  });

  it("nunca adiciona quantidade menor que 1", () => {
    const itens = adicionarItem([], { ...itemBase(), quantidade: 0 });
    expect(itens[0].quantidade).toBe(1);
  });
});

describe("alterarQuantidade", () => {
  it("altera a quantidade de um item", () => {
    const itens = alterarQuantidade([itemBase()], "p1", 4);
    expect(itens[0].quantidade).toBe(4);
  });

  it("mantém no mínimo 1 e no máximo o estoque", () => {
    expect(alterarQuantidade([itemBase()], "p1", 0)[0].quantidade).toBe(1);
    expect(alterarQuantidade([itemBase()], "p1", 99)[0].quantidade).toBe(10);
  });

  it("não altera outros itens", () => {
    const itens = [itemBase(), itemBase({ produtoId: "p2", nome: "Outro" })];
    const resultado = alterarQuantidade(itens, "p1", 3);
    expect(resultado[1].quantidade).toBe(1);
  });
});

describe("removerItem e limparCarrinho", () => {
  it("remove apenas o item indicado", () => {
    const itens = [itemBase(), itemBase({ produtoId: "p2" })];
    expect(removerItem(itens, "p1")).toHaveLength(1);
  });

  it("limpa o carrinho por completo", () => {
    expect(limparCarrinho()).toEqual([]);
  });
});

describe("calcularTotais", () => {
  it("soma quantidades e valores de todos os itens", () => {
    const itens = [
      itemBase({ preco: 4990, quantidade: 2 }),
      itemBase({ produtoId: "p2", preco: 1000, quantidade: 3 }),
    ];
    expect(calcularTotais(itens)).toEqual({ totalItens: 5, totalCentavos: 12980 });
  });

  it("retorna zeros para carrinho vazio", () => {
    expect(calcularTotais([])).toEqual({ totalItens: 0, totalCentavos: 0 });
  });
});
