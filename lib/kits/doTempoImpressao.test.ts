import { describe, expect, it } from "vitest";
import { custoDaPeca } from "@/lib/producao/ganhoImpressao";
import { pecaDoPlano } from "./doTempoImpressao";

describe("pecaDoPlano", () => {
  it("placa com 10 peças conta 1/10 do peso e do tempo", () => {
    expect(pecaDoPlano([{ id: "a", nome: "Bota", minutos: 300, quantidade: 10, pesoGramas: 120, margemPercentual: 80 }])).toEqual({
      pesoGramas: 12,
      tempoMinutos: 30,
      margemPercentual: 80,
    });
  });

  it("várias partes: 1 de cada, com a margem ponderada pelo custo de cada parte", () => {
    const base = { id: "a", nome: "Base", minutos: 120, quantidade: 1, pesoGramas: 60, margemPercentual: 100 };
    const topo = { id: "b", nome: "Topo", minutos: 60, quantidade: 2, pesoGramas: 20, margemPercentual: 50 };
    const custoBase = custoDaPeca(base)!;
    const custoTopo = custoDaPeca(topo)!;
    const peca = pecaDoPlano([base, topo]);
    expect(peca.pesoGramas).toBe(70);
    expect(peca.tempoMinutos).toBe(150);
    expect(peca.margemPercentual).toBeCloseTo(((custoBase * 100 + custoTopo * 50) / (custoBase + custoTopo)), 0);
  });

  it("parte sem peso ou sem margem deixa peso/margem em aberto", () => {
    const peca = pecaDoPlano([
      { id: "a", nome: "Base", minutos: 120, pesoGramas: 60 },
      { id: "b", nome: "Topo", minutos: 60 },
    ]);
    expect(peca).toEqual({ pesoGramas: null, tempoMinutos: 180, margemPercentual: null });
  });
});
