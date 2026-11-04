import { describe, expect, it } from "vitest";
import { calcularGanho, custoDaPeca, ganhoDaPlaca, ganhoDoConjunto } from "./ganhoImpressao";
import { validarItens, validarMargemDescontos } from "./planosImpressao";

const placa = { minutos: 120, quantidade: 2, pesoGramas: 100, margemPercentual: 50 };

describe("custoDaPeca", () => {
  it("divide a placa pelas peças: o mesmo peso em 2 peças custa menos por peça", () => {
    const uma = custoDaPeca({ ...placa, quantidade: 1 })!;
    const duas = custoDaPeca(placa)!;
    expect(duas).toBeLessThan(uma);
  });

  it("sem peso ou tempo não calcula", () => {
    expect(custoDaPeca({ ...placa, pesoGramas: NaN })).toBeNull();
    expect(custoDaPeca({ ...placa, minutos: 0 })).toBeNull();
  });
});

describe("calcularGanho (margem líquida sobre o preço, EDI-137)", () => {
  it("custo R$ 58,46 e 25% na Shopee: o mesmo preço da calculadora", () => {
    const shopee = calcularGanho(5846, 25).canais.shopee!;
    expect(shopee.precoCentavos).toBe(12863);
    expect(shopee.lucroCentavos! / shopee.precoCentavos!).toBeGreaterThanOrEqual(0.25);
    expect(shopee.lucroCentavos! / shopee.precoCentavos!).toBeLessThan(0.251);
  });

  it("anúncio com ROAS 8 entra só na Shopee e o lucro continua sendo a margem", () => {
    const sem = calcularGanho(5846, 25);
    const com = calcularGanho(5846, 25, 12.5);
    const shopee = com.canais.shopee!;
    expect(shopee.precoCentavos!).toBeGreaterThan(sem.canais.shopee!.precoCentavos!);
    expect(shopee.anuncioCentavos).toBe(Math.round(shopee.precoCentavos! * 0.125));
    expect(shopee.lucroCentavos! / shopee.precoCentavos!).toBeGreaterThanOrEqual(0.25);
    expect(com.canais.direta!.precoCentavos).toBe(sem.canais.direta!.precoCentavos);
    expect(com.canais.direta!.anuncioCentavos).toBe(0);
  });
});

describe("ganhoDaPlaca", () => {
  it("o lucro de cada canal é a margem pedida em % do preço", () => {
    const ganho = ganhoDaPlaca(placa)!;
    expect(ganho.margemPercentual).toBe(50);
    for (const canal of [ganho.canais.shopee!, ganho.canais.direta!]) {
      expect(canal.precoCentavos).not.toBeNull();
      expect(canal.lucroCentavos! / canal.precoCentavos!).toBeGreaterThanOrEqual(0.5);
      expect(canal.lucroCentavos! / canal.precoCentavos!).toBeLessThan(0.501);
    }
    // Shopee cobra comissão: o preço fica acima da venda direta.
    expect(ganho.canais.shopee!.precoCentavos!).toBeGreaterThan(ganho.canais.direta!.precoCentavos!);
  });

  it("sem margem ou com margem de 100% ou mais não calcula", () => {
    expect(ganhoDaPlaca({ ...placa, margemPercentual: NaN })).toBeNull();
    expect(ganhoDaPlaca({ ...placa, margemPercentual: 100 })).toBeNull();
  });
});

describe("ganhoDoConjunto", () => {
  it("soma os custos com uma embalagem só e pondera a margem pelo custo", () => {
    const a = ganhoDaPlaca(placa)!;
    const outra = { ...placa, pesoGramas: 300, margemPercentual: 20 };
    const b = ganhoDaPlaca(outra)!;
    const conjunto = ganhoDoConjunto([placa, outra])!;
    expect(conjunto.custoCentavos).toBe(a.custoCentavos + b.custoCentavos - 500);
    expect(conjunto.margemPercentual).toBeCloseTo((a.custoCentavos * 50 + b.custoCentavos * 20) / (a.custoCentavos + b.custoCentavos));
  });

  it("parte sem peso deixa o conjunto sem cálculo", () => {
    expect(ganhoDoConjunto([placa, { ...placa, pesoGramas: NaN }])).toBeNull();
  });
});

describe("validarItens com peso e margem", () => {
  const base = { nome: "Base", minutos: 60, quantidade: 1 };

  it("guarda peso e margem; null fica de fora", () => {
    expect(validarItens([{ ...base, pesoGramas: 42.5, margemPercentual: 80 }]).itens![0]).toMatchObject({
      pesoGramas: 42.5,
      margemPercentual: 80,
    });
    const semValores = validarItens([{ ...base, pesoGramas: null, margemPercentual: null }]).itens![0];
    expect(semValores).not.toHaveProperty("pesoGramas");
    expect(semValores).not.toHaveProperty("margemPercentual");
  });

  it("recusa peso ou margem inválidos", () => {
    expect(validarItens([{ ...base, pesoGramas: 0 }]).erro).toMatch(/peso/);
    expect(validarItens([{ ...base, pesoGramas: "abc" }]).erro).toMatch(/peso/);
    expect(validarItens([{ ...base, margemPercentual: -1 }]).erro).toMatch(/margem/);
    expect(validarItens([{ ...base, margemPercentual: 100 }]).erro).toMatch(/margem inválida \(0 a 99,9% do preço\)/);
  });
});

describe("margem do anúncio com folga (Shopee)", () => {
  it("o preço da Shopee sai da folga e a venda direta continua no quero ganhar", () => {
    const sem = calcularGanho(5846, 25);
    const com = calcularGanho(5846, 25, 0, 40);
    expect(com.margemDescontosPercentual).toBe(40);
    const shopee = com.canais.shopee!;
    expect(shopee.lucroCentavos! / shopee.precoCentavos!).toBeGreaterThanOrEqual(0.4);
    expect(com.canais.direta!.precoCentavos).toBe(sem.canais.direta!.precoCentavos);
  });

  it("folga que não passa do quero ganhar é ignorada", () => {
    expect(calcularGanho(5846, 25, 0, 20).margemDescontosPercentual).toBeNull();
    expect(calcularGanho(5846, 25, 0, 25).canais.shopee!.precoCentavos).toBe(calcularGanho(5846, 25).canais.shopee!.precoCentavos);
  });
});

describe("validarMargemDescontos", () => {
  it("ausente não mexe, null remove, número de 0 a menos de 100", () => {
    expect(validarMargemDescontos(undefined)).toEqual({});
    expect(validarMargemDescontos(null)).toEqual({ margem: null });
    expect(validarMargemDescontos(40)).toEqual({ margem: 40 });
    expect(validarMargemDescontos(100).erro).toMatch(/folga inválida/);
    expect(validarMargemDescontos("40").erro).toMatch(/folga inválida/);
  });
});
