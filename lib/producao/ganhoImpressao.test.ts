import { describe, expect, it } from "vitest";
import { custoDaPeca, ganhoDaPlaca, ganhoDoConjunto } from "./ganhoImpressao";
import { validarItens } from "./planosImpressao";

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

describe("ganhoDaPlaca", () => {
  it("o preço de cada canal deixa pelo menos o ganho pedido (custo × margem)", () => {
    const ganho = ganhoDaPlaca(placa)!;
    expect(ganho.lucroDesejadoCentavos).toBe(Math.round(ganho.custoCentavos * 0.5));
    for (const canal of [ganho.canais.shopee!, ganho.canais.direta!]) {
      expect(canal.precoCentavos).not.toBeNull();
      expect(canal.lucroCentavos!).toBeGreaterThanOrEqual(ganho.lucroDesejadoCentavos);
    }
    // Shopee cobra comissão: o preço fica acima da venda direta.
    expect(ganho.canais.shopee!.precoCentavos!).toBeGreaterThan(ganho.canais.direta!.precoCentavos!);
  });

  it("sem margem não calcula", () => {
    expect(ganhoDaPlaca({ ...placa, margemPercentual: NaN })).toBeNull();
  });
});

describe("ganhoDoConjunto", () => {
  it("soma as partes com uma embalagem só", () => {
    const a = ganhoDaPlaca(placa)!;
    const conjunto = ganhoDoConjunto([placa, placa])!;
    expect(conjunto.custoCentavos).toBe(2 * a.custoCentavos - 500);
    expect(conjunto.lucroDesejadoCentavos).toBe(2 * a.lucroDesejadoCentavos);
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
  });
});
