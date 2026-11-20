import { describe, expect, it } from "vitest";
import type { InsumoJson } from "@/lib/models/insumo";
import {
  custoUnitarioCentavos,
  descricaoDaCompra,
  equivalenciaMil,
  formatarCustoUnitario,
  gastoPorCategoria,
  paraCalculadora,
  precoParaCampo,
  rotuloCompra,
  rotuloCustoUnitario,
} from "./insumos";

/** O Intl do pt-BR separa "R$" do valor com espaço fino (NBSP). */
const reais = (texto: string) => `R$ ${texto}`;

const insumo = (parcial: Partial<InsumoJson> = {}): InsumoJson => ({
  id: "1",
  nome: "Argola chaveiro 25 mm",
  categoria: "insumos",
  unidade: "unidade",
  quantidade: 100,
  valorTotalCentavos: 3900,
  ultimaCompraEm: "2026-11-20",
  custoUnitarioCentavos: 39,
  totalGastoCentavos: 3900,
  compras: 1,
  ...parcial,
});

describe("custoUnitarioCentavos", () => {
  it("divide o valor pago pela quantidade comprada", () => {
    expect(custoUnitarioCentavos(100, 3900)).toBe(39);
    expect(custoUnitarioCentavos(1000, 8000)).toBe(8);
  });

  it("mantém a fração de centavo", () => {
    expect(custoUnitarioCentavos(300, 4000)).toBeCloseTo(13.3333, 4);
  });

  it("devolve 0 sem quantidade", () => {
    expect(custoUnitarioCentavos(0, 3900)).toBe(0);
  });
});

describe("formatação", () => {
  it("mostra 2 casas quando o centavo fecha e 4 quando não fecha", () => {
    expect(formatarCustoUnitario(39)).toBe(reais("0,39"));
    expect(formatarCustoUnitario(13.3333)).toBe(reais("0,1333"));
  });

  it("escreve o custo com a unidade", () => {
    expect(rotuloCustoUnitario("grama", 8)).toBe(`${reais("0,08")} por grama`);
  });

  it("converte grama e ml para kg e litro", () => {
    expect(equivalenciaMil("grama", 8)).toBe(`${reais("80,00")} por kg`);
    expect(equivalenciaMil("ml", 5)).toBe(`${reais("50,00")} por litro`);
    expect(equivalenciaMil("unidade", 39)).toBeNull();
  });

  it("resume a compra", () => {
    expect(rotuloCompra("unidade", 100, 3900)).toBe(`100 un por ${reais("39,00")}`);
    expect(rotuloCompra("grama", 1000, 8000)).toBe(`1.000 g por ${reais("80,00")}`);
  });

  it("descreve a compra para a despesa", () => {
    expect(descricaoDaCompra({ nome: "PLA Basic", marca: "Bambu", unidade: "grama" }, 1000)).toBe("PLA Basic (Bambu) — 1.000 g");
    expect(descricaoDaCompra({ nome: "Argola", unidade: "unidade" }, 100)).toBe("Argola — 100 un");
  });
});

describe("precoParaCampo", () => {
  it("escreve o preço em reais para o campo da calculadora", () => {
    expect(precoParaCampo(39)).toBe("0.39");
    expect(precoParaCampo(8)).toBe("0.08");
    expect(precoParaCampo(13.3333)).toBe("0.1333");
    expect(precoParaCampo(0)).toBe("0");
  });
});

describe("paraCalculadora", () => {
  it("monta o rótulo do dropdown e a linha de custo extra", () => {
    const opcao = paraCalculadora(insumo({ marca: "Keychain" }));
    expect(opcao.nome).toBe("Argola chaveiro 25 mm Keychain");
    expect(opcao.rotulo).toBe(`Argola chaveiro 25 mm Keychain · ${reais("0,39")} por unidade`);
    expect(opcao.precoReais).toBe("0.39");
    expect(opcao.categoria).toBe("outros");
  });

  it("embalagem entra como embalagem no custo extra", () => {
    expect(paraCalculadora(insumo({ categoria: "embalagem" })).categoria).toBe("embalagem");
  });
});

describe("gastoPorCategoria", () => {
  it("soma o gasto de cada categoria, do maior para o menor", () => {
    const lista = gastoPorCategoria([
      insumo({ id: "1", categoria: "insumos", totalGastoCentavos: 3900 }),
      insumo({ id: "2", categoria: "filamento", totalGastoCentavos: 16000 }),
      insumo({ id: "3", categoria: "filamento", totalGastoCentavos: 8000 }),
    ]);
    expect(lista).toEqual([
      { categoria: "filamento", rotulo: "Filamento", valorCentavos: 24000, itens: 2 },
      { categoria: "insumos", rotulo: "Outros insumos", valorCentavos: 3900, itens: 1 },
    ]);
  });
});
