import { describe, expect, it } from "vitest";
import { ganhoDaPlaca, ganhoDoConjunto } from "@/lib/producao/ganhoImpressao";
import { opcoesDeBusca, precoVendaDiretaDoPlano } from "./opcoes";

const parteA = { id: "a", nome: "Corpo", minutos: 120, quantidade: 1, pesoGramas: 40, margemPercentual: 100 };
const parteB = { id: "b", nome: "Cabeça", minutos: 60, quantidade: 2, pesoGramas: 30, margemPercentual: 100 };

describe("precoVendaDiretaDoPlano", () => {
  it("uma parte usa a placa; várias usam o conjunto, como a tela", () => {
    expect(precoVendaDiretaDoPlano([parteA])).toBe(ganhoDaPlaca(parteA)!.canais.direta!.precoCentavos);
    expect(precoVendaDiretaDoPlano([parteA, parteB])).toBe(ganhoDoConjunto([parteA, parteB])!.canais.direta!.precoCentavos);
    expect(precoVendaDiretaDoPlano([parteA])).toBeGreaterThan(0);
  });

  it("sem peso ou margem em alguma parte → null", () => {
    expect(precoVendaDiretaDoPlano([parteA, { ...parteB, pesoGramas: undefined }])).toBeNull();
    expect(precoVendaDiretaDoPlano([{ ...parteA, margemPercentual: undefined }])).toBeNull();
    expect(precoVendaDiretaDoPlano([])).toBeNull();
  });
});

describe("opcoesDeBusca", () => {
  it("junta produtos e planos avulsos, sem os planos ligados a produto", () => {
    const opcoes = opcoesDeBusca(
      [
        { id: "p1", nome: "Vaso", precoCentavos: 4000, publicado: true },
        { id: "p2", nome: "Árvore", precoCentavos: 0, publicado: false },
      ],
      [
        { id: "x1", produtoId: "p1", itens: [parteA] },
        { id: "x2", nome: "Boneco", itens: [parteA] },
      ]
    );
    expect(opcoes.map((o) => `${o.origem}:${o.nome}`)).toEqual(["produto:Árvore", "tempoImpressao:Boneco", "produto:Vaso"]);
    expect(opcoes[0]).toMatchObject({ precoCentavos: null, rascunho: true });
    expect(opcoes[1].precoCentavos).toBeGreaterThan(0);
  });
});
