import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import {
  CANAIS_CONTROLE,
  type CanalControle,
  type ItemControleJson,
  type VendaControleJson,
} from "@/lib/models/controleVendas";

/** Mesmo padrão da calculadora: Mercado Livre Clássico, custo fixo por unidade abaixo de R$ 79. */
export const MERCADO_LIVRE_PADRAO = { percentual: 14, fixaUnidadeCentavos: 650, limiteFixaCentavos: 7900 };

export interface TaxaSugerida {
  taxaPercentual: number;
  taxaFixaCentavos: number;
}

/** Taxa que já vem preenchida ao trocar o canal da venda — sempre editável depois. */
export function taxaPadraoCanal(
  canal: CanalControle,
  taxas: TaxasCanaisConfig,
  precoUnitarioCentavos: number,
  quantidade: number
): TaxaSugerida {
  switch (canal) {
    case "site":
      return { taxaPercentual: taxas.siteTaxaPercentual, taxaFixaCentavos: taxas.siteTaxaFixaCentavos };
    case "shopee":
      return { taxaPercentual: taxas.shopeeTaxaPercentual, taxaFixaCentavos: 0 };
    case "mercadoLivre":
      return {
        taxaPercentual: MERCADO_LIVRE_PADRAO.percentual,
        taxaFixaCentavos:
          precoUnitarioCentavos < MERCADO_LIVRE_PADRAO.limiteFixaCentavos
            ? MERCADO_LIVRE_PADRAO.fixaUnidadeCentavos * quantidade
            : 0,
      };
    case "direta":
      return { taxaPercentual: 0, taxaFixaCentavos: 0 };
  }
}

export interface ResultadoVenda {
  receitaCentavos: number;
  taxasCentavos: number;
  custoCentavos: number;
  lucroCentavos: number;
}

type VendaCalculo = Pick<
  VendaControleJson,
  "quantidade" | "precoUnitarioCentavos" | "taxaPercentual" | "taxaFixaCentavos" | "extrasCentavos"
>;

/** Lucro = receita − taxa do canal − custo das peças − material extra enviado. */
export function calcularVenda(venda: VendaCalculo, custoUnitarioCentavos: number): ResultadoVenda {
  const receitaCentavos = venda.precoUnitarioCentavos * venda.quantidade;
  const taxasCentavos = Math.round((receitaCentavos * venda.taxaPercentual) / 100) + venda.taxaFixaCentavos;
  const custoCentavos = custoUnitarioCentavos * venda.quantidade + venda.extrasCentavos;
  return {
    receitaCentavos,
    taxasCentavos,
    custoCentavos,
    lucroCentavos: receitaCentavos - taxasCentavos - custoCentavos,
  };
}

export function custoEfetivo(item: ItemControleJson): number {
  return item.custoUnitarioCentavos ?? item.custoCadastroCentavos ?? 0;
}

export function precoEfetivo(item: ItemControleJson): number {
  return item.precoVendaCentavos ?? item.precoSiteCentavos;
}

export interface ResumoItem extends ResultadoVenda {
  vendidos: number;
  /** Produzido − vendidos; nunca negativo. */
  saldo: number;
}

export function resumirItem(item: ItemControleJson): ResumoItem {
  const custo = custoEfetivo(item);
  const total: ResumoItem = {
    vendidos: 0,
    saldo: 0,
    receitaCentavos: 0,
    taxasCentavos: 0,
    custoCentavos: 0,
    lucroCentavos: 0,
  };
  for (const venda of item.vendas) {
    const r = calcularVenda(venda, custo);
    total.vendidos += venda.quantidade;
    total.receitaCentavos += r.receitaCentavos;
    total.taxasCentavos += r.taxasCentavos;
    total.custoCentavos += r.custoCentavos;
    total.lucroCentavos += r.lucroCentavos;
  }
  total.saldo = Math.max(0, item.produzido - total.vendidos);
  return total;
}

export interface ResumoCanal extends ResultadoVenda {
  canal: CanalControle;
  vendidos: number;
}

/** Totais por canal, na ordem fixa dos canais, só os que tiveram venda. */
export function resumirPorCanal(itens: ItemControleJson[]): ResumoCanal[] {
  const mapa = new Map<CanalControle, ResumoCanal>();
  for (const item of itens) {
    const custo = custoEfetivo(item);
    for (const venda of item.vendas) {
      const r = calcularVenda(venda, custo);
      const atual = mapa.get(venda.canal) ?? {
        canal: venda.canal,
        vendidos: 0,
        receitaCentavos: 0,
        taxasCentavos: 0,
        custoCentavos: 0,
        lucroCentavos: 0,
      };
      atual.vendidos += venda.quantidade;
      atual.receitaCentavos += r.receitaCentavos;
      atual.taxasCentavos += r.taxasCentavos;
      atual.custoCentavos += r.custoCentavos;
      atual.lucroCentavos += r.lucroCentavos;
      mapa.set(venda.canal, atual);
    }
  }
  return CANAIS_CONTROLE.filter((c) => mapa.has(c)).map((c) => mapa.get(c)!);
}

/**
 * Estoque que o site deve ter depois de lançar a produção: só sobe — vira o
 * saldo (produzido − vendidos) quando ele é maior que o estoque atual.
 */
export function estoqueAposProducao(estoqueAtual: number, produzido: number, vendidos: number): number {
  return Math.max(estoqueAtual, produzido - vendidos);
}
