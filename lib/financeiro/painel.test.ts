import { describe, expect, it } from "vitest";
import { dataDoDia, diaDe, ultimosMeses } from "./datas";
import { calcularPayback, filtrarPeriodo, porMes, porOrigem, somar, type VendaPainel } from "./painel";

const agora = new Date("2026-11-17T15:00:00Z");

function venda(dia: string, parcial: Partial<VendaPainel> = {}): VendaPainel {
  return {
    data: dataDoDia(dia)!,
    origem: "manual_pix",
    receitaCentavos: 10000,
    taxaCentavos: 0,
    custoCentavos: 4000,
    depreciacaoCentavos: 500,
    unidadesSemCusto: 0,
    ...parcial,
  };
}

describe("datas", () => {
  it("lê o dia em Brasília e recusa data impossível", () => {
    expect(diaDe(dataDoDia("2026-11-01")!)).toBe("2026-11-01");
    expect(dataDoDia("2026-02-31")).toBeNull();
    expect(ultimosMeses(agora, 3)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(ultimosMeses(new Date("2026-01-10T12:00:00Z"), 2)).toEqual(["2025-12", "2026-01"]);
  });
});

describe("somar", () => {
  it("lucro desconta taxa e custo; retorno devolve o desgaste", () => {
    const t = somar([venda("2026-11-01", { taxaCentavos: 500 }), venda("2026-11-02")]);
    expect(t.receitaCentavos).toBe(20000);
    expect(t.lucroCentavos).toBe(20000 - 500 - 8000);
    expect(t.retornoCentavos).toBe(t.lucroCentavos + 1000);
    expect(t.margemPercentual).toBe(57.5);
  });
});

describe("períodos e agrupamentos", () => {
  const vendas = [
    venda("2026-11-10"),
    venda("2026-10-25", { origem: "site" }),
    venda("2026-03-01", { origem: "mercado_livre", custoCentavos: 12000 }),
    venda("2025-12-31"),
  ];

  it("filtra mês, 30 dias, ano e tudo", () => {
    expect(filtrarPeriodo(vendas, "mes", agora)).toHaveLength(1);
    expect(filtrarPeriodo(vendas, "30d", agora)).toHaveLength(2);
    expect(filtrarPeriodo(vendas, "ano", agora)).toHaveLength(3);
    expect(filtrarPeriodo(vendas, "tudo", agora)).toHaveLength(4);
  });

  it("agrupa por mês com zeros e por origem do maior lucro ao menor", () => {
    const meses = porMes(vendas, agora, 12);
    expect(meses).toHaveLength(12);
    expect(meses.at(-1)).toMatchObject({ mes: "2026-11", rotulo: "nov/26", lucroCentavos: 6000 });
    expect(meses.find((m) => m.mes === "2026-03")?.lucroCentavos).toBe(-2000);
    expect(meses.find((m) => m.mes === "2026-06")?.vendas).toBe(0);
    expect(porOrigem(vendas).map((o) => o.origem)).toEqual(["manual_pix", "site", "mercado_livre"]);
  });
});

describe("calcularPayback", () => {
  const impressoras = [
    { id: "b", nome: "P1S", dataCompra: dataDoDia("2026-05-01")!, valorCentavos: 600000 },
    { id: "a", nome: "A1", dataCompra: dataDoDia("2026-01-01")!, valorCentavos: 300000 },
  ];

  it("paga primeiro a impressora mais antiga e estima os meses que faltam", () => {
    const vendas = [venda("2026-11-01", { receitaCentavos: 404000, custoCentavos: 4000, depreciacaoCentavos: 0 })];
    const p = calcularPayback(vendas, impressoras, agora);
    expect(p.investidoCentavos).toBe(900000);
    expect(p.retornoCentavos).toBe(400000);
    expect(p.impressoras.map((i) => [i.nome, i.pagoCentavos, i.paga])).toEqual([
      ["A1", 300000, true],
      ["P1S", 100000, false],
    ]);
    expect(p.faltaCentavos).toBe(500000);
    expect(p.retornoMedioMesCentavos).toBe(100000);
    expect(p.mesesParaQuitar).toBe(5);
  });

  it("prejuízo não paga nada e sem impressora não tem percentual", () => {
    const p = calcularPayback([venda("2026-11-01", { receitaCentavos: 100, depreciacaoCentavos: 0 })], impressoras, agora);
    expect(p.impressoras.every((i) => i.pagoCentavos === 0)).toBe(true);
    expect(p.mesesParaQuitar).toBeNull();
    expect(calcularPayback([], [], agora).percentual).toBeNull();
  });
});
