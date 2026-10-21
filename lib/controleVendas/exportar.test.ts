import { describe, expect, it } from "vitest";
import type { ItemControleJson } from "@/lib/models/controleVendas";
import { gerarCsv, gerarXls, linhasProducao, linhasVendas } from "./exportar";

const itens: ItemControleJson[] = [
  {
    produtoId: "p1",
    nome: 'Vaso "Onda", azul',
    foto: null,
    estoque: 0,
    precoSiteCentavos: 5000,
    custoCadastroCentavos: 1500,
    produzido: 4,
    custoUnitarioCentavos: null,
    precoVendaCentavos: null,
    vendas: [
      {
        id: "v1",
        data: "2026-10-20T12:00:00.000Z",
        quantidade: 4,
        cliente: "Ana & Bia",
        canal: "shopee",
        precoUnitarioCentavos: 5000,
        taxaPercentual: 10,
        taxaFixaCentavos: 0,
        extrasCentavos: 100,
        baixarEstoque: true,
        quantidadeBaixada: 4,
      },
    ],
  },
];

describe("exportar", () => {
  it("monta a linha de produção com totais em reais", () => {
    expect(linhasProducao(itens)[0]).toEqual([itens[0].nome, 4, 4, 0, 0, 15, 50, 200, 20, 61, 119]);
  });

  it("monta uma linha por venda", () => {
    expect(linhasVendas(itens)[0].slice(0, 5)).toEqual([itens[0].nome, "2026-10-20", "Ana & Bia", "Shopee", 4]);
  });

  it("CSV escapa aspas e vírgulas e começa com BOM", () => {
    const csv = gerarCsv(itens);
    expect(csv.startsWith("﻿Produto,")).toBe(true);
    expect(csv).toContain('"Vaso ""Onda"", azul"');
  });

  it("XLS tem uma aba por tabela e escapa XML", () => {
    const xls = gerarXls(itens);
    expect(xls).toContain('ss:Name="Produção"');
    expect(xls).toContain('ss:Name="Vendas"');
    expect(xls).toContain("Ana &amp; Bia");
  });
});
