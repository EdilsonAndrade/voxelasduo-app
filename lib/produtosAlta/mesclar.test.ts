import { describe, expect, it } from "vitest";
import type { ItemEmAlta } from "@/lib/models/produtosAlta";
import { mesclarListas } from "./mesclar";

function item(chave: string, posicao: number, categoriaId: string): ItemEmAlta {
  return { chave, origem: "vendido", posicao, categoriaId, links: { mercadoLivre: "" } };
}

describe("mesclarListas", () => {
  it("intercala por posição e mantém a ordem das categorias no empate", () => {
    const resultado = mesclarListas([
      [item("A1", 1, "A"), item("A2", 2, "A")],
      [item("B1", 1, "B"), item("B2", 2, "B")],
    ]);
    expect(resultado.map((i) => i.chave)).toEqual(["A1", "B1", "A2", "B2"]);
  });

  it("item repetido fica uma vez, na melhor posição", () => {
    const resultado = mesclarListas([
      [item("X", 5, "A")],
      [item("X", 2, "B")],
    ]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({ posicao: 2, categoriaId: "B" });
  });
});
