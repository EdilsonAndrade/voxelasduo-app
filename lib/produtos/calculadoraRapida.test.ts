import { describe, expect, it } from "vitest";
import { calcularCanalCalculadora, calcularProducaoMensal } from "./calculadoraRapida";

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
