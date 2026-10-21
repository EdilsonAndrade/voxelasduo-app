import { describe, expect, it } from "vitest";
import { TAXAS_CANAIS_PADRAO } from "@/lib/models/configuracao";
import type { ItemControleJson, VendaControleJson } from "@/lib/models/controleVendas";
import {
  calcularVenda,
  estoqueAposProducao,
  resumirItem,
  resumirPorCanal,
  taxaPadraoCanal,
} from "./calculo";

function venda(parcial: Partial<VendaControleJson> = {}): VendaControleJson {
  return {
    id: "v1",
    data: "2026-10-20T12:00:00.000Z",
    quantidade: 2,
    cliente: "Ana",
    canal: "direta",
    precoUnitarioCentavos: 5000,
    taxaPercentual: 0,
    taxaFixaCentavos: 0,
    extrasCentavos: 0,
    baixarEstoque: true,
    quantidadeBaixada: 2,
    ...parcial,
  };
}

function item(parcial: Partial<ItemControleJson> = {}): ItemControleJson {
  return {
    produtoId: "p1",
    nome: "Vaso",
    foto: null,
    estoque: 3,
    precoSiteCentavos: 5000,
    custoCadastroCentavos: 1500,
    produzido: 10,
    custoUnitarioCentavos: null,
    precoVendaCentavos: null,
    vendas: [],
    ...parcial,
  };
}

describe("calcularVenda", () => {
  it("desconta taxa %, taxa fixa, custo das peças e material extra", () => {
    const r = calcularVenda(
      venda({ quantidade: 2, precoUnitarioCentavos: 5000, taxaPercentual: 10, taxaFixaCentavos: 300, extrasCentavos: 200 }),
      1500
    );
    expect(r).toEqual({ receitaCentavos: 10000, taxasCentavos: 1300, custoCentavos: 3200, lucroCentavos: 5500 });
  });
});

describe("taxaPadraoCanal", () => {
  it("site e Shopee vêm da configuração; venda direta sem taxa", () => {
    expect(taxaPadraoCanal("site", TAXAS_CANAIS_PADRAO, 5000, 1)).toEqual({ taxaPercentual: 4.99, taxaFixaCentavos: 0 });
    expect(taxaPadraoCanal("shopee", TAXAS_CANAIS_PADRAO, 5000, 1).taxaPercentual).toBe(14);
    expect(taxaPadraoCanal("direta", TAXAS_CANAIS_PADRAO, 5000, 1)).toEqual({ taxaPercentual: 0, taxaFixaCentavos: 0 });
  });

  it("Mercado Livre cobra custo fixo por unidade só abaixo de R$ 79", () => {
    expect(taxaPadraoCanal("mercadoLivre", TAXAS_CANAIS_PADRAO, 5000, 3).taxaFixaCentavos).toBe(1950);
    expect(taxaPadraoCanal("mercadoLivre", TAXAS_CANAIS_PADRAO, 7900, 3).taxaFixaCentavos).toBe(0);
  });
});

describe("resumirItem", () => {
  it("usa o custo do cadastro quando o controle não tem custo próprio", () => {
    const r = resumirItem(item({ vendas: [venda()] }));
    expect(r.vendidos).toBe(2);
    expect(r.saldo).toBe(8);
    expect(r.lucroCentavos).toBe(10000 - 3000);
  });

  it("custo próprio do controle tem prioridade e saldo nunca fica negativo", () => {
    const r = resumirItem(item({ produzido: 1, custoUnitarioCentavos: 1000, vendas: [venda()] }));
    expect(r.saldo).toBe(0);
    expect(r.lucroCentavos).toBe(10000 - 2000);
  });
});

describe("resumirPorCanal", () => {
  it("agrupa na ordem fixa dos canais, só os que venderam", () => {
    const r = resumirPorCanal([
      item({ vendas: [venda({ canal: "shopee" }), venda({ id: "v2", canal: "site", quantidade: 1 })] }),
    ]);
    expect(r.map((c) => [c.canal, c.vendidos])).toEqual([
      ["site", 1],
      ["shopee", 2],
    ]);
  });
});

describe("estoqueAposProducao", () => {
  it("sobe para o saldo quando ele é maior que o estoque atual", () => {
    expect(estoqueAposProducao(2, 10, 3)).toBe(7);
  });

  it("nunca desce o estoque", () => {
    expect(estoqueAposProducao(9, 10, 3)).toBe(9);
  });
});
