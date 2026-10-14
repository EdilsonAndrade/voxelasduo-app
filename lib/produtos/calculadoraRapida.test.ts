import { describe, expect, it } from "vitest";
import { calcularCanalCalculadora, calcularLimiteAnuncio, calcularProducaoMensal } from "./calculadoraRapida";

describe("calcularProducaoMensal", () => {
  it("conta só mesas inteiras no dia", () => {
    expect(
      calcularProducaoMensal({ pecasPorMesa: 8, horasMesaCheia: 3, horasPorDia: 20, diasPorMes: 30 })
    ).toEqual({ mesasPorDia: 6, pecasPorDia: 48, pecasPorMes: 1440 });
  });

  it("devolve null com entrada inválida", () => {
    expect(
      calcularProducaoMensal({ pecasPorMesa: 0, horasMesaCheia: 3, horasPorDia: 20, diasPorMes: 30 })
    ).toBeNull();
  });
});

describe("calcularCanalCalculadora", () => {
  it("garante a margem sobre o custo depois da taxa e do anúncio", () => {
    const r = calcularCanalCalculadora({
      custoCentavos: 1000,
      margemDesejadaPercentual: 100,
      taxa: { percentual: 14, fixaCentavos: 0 },
      anuncioPercentual: 6,
      pecasPorMes: 10,
    });
    expect(r.precoCentavos).toBe(2500);
    expect(r.taxaCentavos).toBe(350);
    expect(r.anuncioCentavos).toBe(150);
    expect(r.lucroCentavos).toBe(1000);
    expect(r.brutoMesCentavos).toBe(25000);
    expect(r.lucroMesCentavos).toBe(10000);
  });

  it("sem preço possível quando taxa + anúncio chegam a 100%", () => {
    const r = calcularCanalCalculadora({
      custoCentavos: 1000,
      margemDesejadaPercentual: 50,
      taxa: { percentual: 60, fixaCentavos: 0 },
      anuncioPercentual: 40,
      pecasPorMes: 10,
    });
    expect(r.precoCentavos).toBeNull();
  });
});

describe("calcularLimiteAnuncio", () => {
  it("teto de anúncio e ROAS para manter 25% do preço (exemplo Shopee R$ 40)", () => {
    const r = calcularLimiteAnuncio({
      precoCentavos: 4000,
      taxaCentavos: 1200,
      custoCentavos: 1000,
      margemMinimaPrecoPercentual: 25,
    });
    expect(r.sobraCentavos).toBe(1800);
    expect(r.tetoAnuncioCentavos).toBe(800);
    expect(r.roasMinimo).toBe(5);
    expect(r.roasPrejuizo).toBeCloseTo(2.22, 2);
  });

  it("sem espaço para anúncio quando a sobra não cobre a margem mínima", () => {
    const r = calcularLimiteAnuncio({
      precoCentavos: 2000,
      taxaCentavos: 800,
      custoCentavos: 1000,
      margemMinimaPrecoPercentual: 25,
    });
    expect(r.tetoAnuncioCentavos).toBe(-300);
    expect(r.roasMinimo).toBeNull();
    expect(r.roasPrejuizo).toBe(10);
  });
});
