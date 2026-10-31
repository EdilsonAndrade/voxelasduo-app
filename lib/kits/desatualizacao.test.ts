import { describe, expect, it } from "vitest";
import type { ReferenciaPreco, ValoresComponente } from "@/lib/models/kit";
import { compararReferencia } from "./desatualizacao";

const arvore: ValoresComponente = { nome: "Árvore", precoCentavos: 3000, pesoGramas: 40, tempoMinutos: 120, custoCentavos: 800 };
const referencia: ReferenciaPreco = {
  somaAvulsaCentavos: 3000,
  custoCentavos: 1300,
  pesoGramas: 40,
  tempoMinutos: 120,
  itens: { a: { ...arvore, quantidade: 1 }, b: { ...arvore, nome: "Estrela", quantidade: 1 } },
  definidoEm: new Date(),
};

describe("compararReferencia", () => {
  it("sem referência ou sem mudança = em dia", () => {
    expect(compararReferencia(undefined, [])).toEqual([]);
    expect(
      compararReferencia(referencia, [
        { produtoId: "a", quantidade: 1, valores: arvore, removido: false },
        { produtoId: "b", quantidade: 1, valores: { ...arvore, nome: "Estrela" }, removido: false },
      ])
    ).toEqual([]);
  });

  it("aponta preço alterado, item incluído e item retirado", () => {
    const mudancas = compararReferencia(referencia, [
      { produtoId: "a", quantidade: 1, valores: { ...arvore, precoCentavos: 3500 }, removido: false },
      { produtoId: "c", quantidade: 2, valores: { ...arvore, nome: "Rena" }, removido: false },
    ]);
    expect(mudancas).toEqual([
      { produtoId: "a", nome: "Árvore", campo: "preco", antes: 3000, depois: 3500 },
      { produtoId: "c", nome: "Rena", campo: "incluido", antes: null, depois: 2 },
      { produtoId: "b", nome: "Estrela", campo: "retirado", antes: 1, depois: null },
    ]);
  });

  it("aponta produto apagado e quantidade alterada", () => {
    expect(
      compararReferencia(referencia, [
        { produtoId: "a", quantidade: 1, valores: arvore, removido: true },
        { produtoId: "b", quantidade: 3, valores: { ...arvore, nome: "Estrela" }, removido: false },
      ]).map((m) => m.campo)
    ).toEqual(["removido", "quantidade"]);
  });

  it("aponta margem alterada", () => {
    const mudancas = compararReferencia(referencia, [
      { produtoId: "a", quantidade: 1, margemPercentual: 60, valores: arvore, removido: false },
      { produtoId: "b", quantidade: 1, valores: { ...arvore, nome: "Estrela" }, removido: false },
    ]);
    expect(mudancas).toEqual([{ produtoId: "a", nome: "Árvore", campo: "margem", antes: null, depois: 60 }]);
  });
});
