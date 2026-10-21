import { ROTULO_CANAL_CONTROLE, type ItemControleJson } from "@/lib/models/controleVendas";
import { calcularVenda, custoEfetivo, precoEfetivo, resumirItem } from "./calculo";

export const CABECALHO_PRODUCAO = [
  "Produto",
  "Produzido",
  "Vendido",
  "Saldo",
  "Estoque no site",
  "Custo unitário",
  "Preço de venda",
  "Receita",
  "Taxas",
  "Custo + extras",
  "Lucro",
];

export const CABECALHO_VENDAS = [
  "Produto",
  "Data",
  "Cliente",
  "Canal",
  "Quantidade",
  "Preço unitário",
  "Taxa %",
  "Taxa fixa",
  "Material extra",
  "Receita",
  "Lucro",
  "Baixou estoque",
];

const reais = (centavos: number) => Number((centavos / 100).toFixed(2));

export function linhasProducao(itens: ItemControleJson[]): (string | number)[][] {
  return itens.map((item) => {
    const r = resumirItem(item);
    return [
      item.nome,
      item.produzido,
      r.vendidos,
      r.saldo,
      item.estoque,
      reais(custoEfetivo(item)),
      reais(precoEfetivo(item)),
      reais(r.receitaCentavos),
      reais(r.taxasCentavos),
      reais(r.custoCentavos),
      reais(r.lucroCentavos),
    ];
  });
}

export function linhasVendas(itens: ItemControleJson[]): (string | number)[][] {
  return itens.flatMap((item) =>
    item.vendas.map((venda) => {
      const r = calcularVenda(venda, custoEfetivo(item));
      return [
        item.nome,
        venda.data.slice(0, 10),
        venda.cliente,
        ROTULO_CANAL_CONTROLE[venda.canal],
        venda.quantidade,
        reais(venda.precoUnitarioCentavos),
        venda.taxaPercentual,
        reais(venda.taxaFixaCentavos),
        reais(venda.extrasCentavos),
        reais(r.receitaCentavos),
        reais(r.lucroCentavos),
        venda.baixarEstoque ? "Sim" : "Não",
      ];
    })
  );
}

function celulaCsv(valor: string | number): string {
  const texto = String(valor);
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * CSV com vírgula e ponto decimal, que o Google Planilhas importa direto. As
 * duas tabelas vão no mesmo arquivo, separadas por uma linha em branco.
 */
export function gerarCsv(itens: ItemControleJson[]): string {
  const bloco = (cabecalho: string[], linhas: (string | number)[][]) =>
    [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(",")).join("\r\n");
  // BOM: sem ele o Excel abre os acentos quebrados.
  return `﻿${bloco(CABECALHO_PRODUCAO, linhasProducao(itens))}\r\n\r\n${bloco(
    CABECALHO_VENDAS,
    linhasVendas(itens)
  )}\r\n`;
}

function escaparXml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function planilhaXml(nome: string, cabecalho: string[], linhas: (string | number)[][]): string {
  const linha = (celulas: (string | number)[], estilo = "") =>
    `<Row>${celulas
      .map((c) =>
        typeof c === "number"
          ? `<Cell${estilo}><Data ss:Type="Number">${c}</Data></Cell>`
          : `<Cell${estilo}><Data ss:Type="String">${escaparXml(c)}</Data></Cell>`
      )
      .join("")}</Row>`;
  return `<Worksheet ss:Name="${escaparXml(nome)}"><Table>${linha(cabecalho, ' ss:StyleID="cab"')}${linhas
    .map((l) => linha(l))
    .join("")}</Table></Worksheet>`;
}

/** Planilha do Excel (XML 2003, abre no Excel e sobe no Google Drive) com uma aba por tabela. */
export function gerarXls(itens: ItemControleJson[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Styles><Style ss:ID="cab"><Font ss:Bold="1"/></Style></Styles>',
    planilhaXml("Produção", CABECALHO_PRODUCAO, linhasProducao(itens)),
    planilhaXml("Vendas", CABECALHO_VENDAS, linhasVendas(itens)),
    "</Workbook>",
  ].join("");
}
