import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import type { TaxasCanaisProduto } from "@/lib/models/produto";
import { FAIXAS_SHOPEE_2026, faixaDoPreco, type FaixaTaxa } from "./calculadoraRapida";

/**
 * Taxa de um canal: percentual sobre o preço + taxa fixa por venda (EDI-106).
 * Com `faixas`, a taxa depende do preço (Shopee) e `percentual`/`fixaCentavos`
 * são os da faixa usada — ver `taxaNoPreco`.
 */
export interface TaxaCanal {
  percentual: number;
  fixaCentavos: number;
  faixas?: FaixaTaxa[];
}

/** Percentual e taxa fixa que o canal cobra num preço (a faixa do preço, quando há faixas). */
export function taxaNoPreco(taxa: TaxaCanal, precoCentavos: number): TaxaCanal {
  if (!taxa.faixas?.length) return taxa;
  const faixa = faixaDoPreco(taxa.faixas, precoCentavos);
  return { percentual: faixa.percentual, fixaCentavos: faixa.fixaCentavos, faixas: taxa.faixas };
}

/** Quanto o canal desconta da venda num preço: percentual + taxa fixa. */
export function comissaoCanal(taxa: TaxaCanal, precoCentavos: number): number {
  const efetiva = taxaNoPreco(taxa, precoCentavos);
  return Math.round((precoCentavos * efetiva.percentual) / 100) + efetiva.fixaCentavos;
}

/**
 * Shopee pela tabela oficial por faixa de preço (a mesma da calculadora) — o
 * percentual próprio do produto, quando informado, substitui o da tabela e
 * mantém a taxa fixa de cada faixa.
 */
function taxaShopee(percentualProduto?: number): TaxaCanal {
  const faixas = FAIXAS_SHOPEE_2026.map((f) => (percentualProduto !== undefined ? { ...f, percentual: percentualProduto } : f));
  return { percentual: faixas[0].percentual, fixaCentavos: faixas[0].fixaCentavos, faixas };
}

/**
 * Menor preço `(base + fixa) / (1 − taxa%)` dentro de uma faixa: percorre as
 * faixas da mais barata para a mais cara; se o preço passa do teto da faixa,
 * tenta a seguinte (no mínimo o piso dela). `null` = taxa `>= 100%`.
 */
function precoPorTaxa(baseCentavos: number, taxa: TaxaCanal): number | null {
  const faixas = taxa.faixas?.length ? taxa.faixas : [{ ateCentavos: null, percentual: taxa.percentual, fixaCentavos: taxa.fixaCentavos }];
  let pisoCentavos = 0;
  for (const faixa of faixas) {
    if (faixa.percentual < 100) {
      const preco = Math.max(Math.round((baseCentavos + faixa.fixaCentavos) / (1 - faixa.percentual / 100)), pisoCentavos);
      if (faixa.ateCentavos === null || preco <= faixa.ateCentavos) return preco;
    }
    if (faixa.ateCentavos === null) return null;
    pisoCentavos = faixa.ateCentavos + 1;
  }
  return null;
}

export type CanalVenda = "mercadoLivre" | "shopee" | "siteProprio";

/** Taxas efetivas de Shopee e site próprio — global com override do produto aplicado. */
export interface TaxasCanaisEfetivas {
  shopee: TaxaCanal;
  siteProprio: TaxaCanal;
}

/** Resultado de um canal para um custo e uma margem: preço sugerido + lucro/margem ao preço sugerido. */
export interface ResultadoCanal {
  canal: CanalVenda;
  taxa: TaxaCanal;
  /** `null` quando a taxa percentual é `>= 100%` (não existe preço válido). */
  precoSugeridoCentavos: number | null;
  /** Taxa percentual + fixa cobrada no preço sugerido, em centavos. */
  comissaoCentavos: number | null;
  lucroLiquidoCentavos: number | null;
  margemPercentual: number | null;
  prejuizo: boolean;
  margemBaixa: boolean;
}

/** Aplica o override do produto sobre o padrão global, campo a campo (ausente = herda). */
export function resolverTaxasCanais(
  global: TaxasCanaisConfig,
  override?: TaxasCanaisProduto
): TaxasCanaisEfetivas {
  return {
    // O percentual global da Shopee não entra mais: só a tabela por faixa ou o % do próprio produto.
    shopee: taxaShopee(override?.shopeeTaxaPercentual),
    siteProprio: {
      percentual: override?.siteTaxaPercentual ?? global.siteTaxaPercentual,
      fixaCentavos: override?.siteTaxaFixaCentavos ?? global.siteTaxaFixaCentavos,
    },
  };
}

/**
 * Preço sugerido de um canal: `(custo × (1 + margem) + taxaFixa) / (1 − taxa%)`
 * — a fórmula do EDI-92 acrescida da taxa fixa do canal (igual a ela quando a
 * taxa fixa é zero). Retorna `null` quando a taxa percentual é `>= 100%`.
 */
export function calcularPrecoSugeridoCanal(
  custoCentavos: number,
  margemDesejadaPercentual: number,
  taxa: TaxaCanal
): number | null {
  return precoPorTaxa(custoCentavos * (1 + margemDesejadaPercentual / 100), taxa);
}

/**
 * Preço de escala de um canal: `(custoCaixa + lucro + taxaFixa) / (1 − taxa%)`.
 * Retorna `null` quando a taxa percentual é `>= 100%`.
 */
export function calcularPrecoEscalaCanal(
  custoCaixaCentavos: number,
  lucroDesejadoCentavos: number,
  taxa: TaxaCanal
): number | null {
  return precoPorTaxa(custoCaixaCentavos + lucroDesejadoCentavos, taxa);
}

/**
 * Monta o resultado de um canal a partir do preço sugerido: comissão (percentual
 * sobre o preço + fixa), lucro líquido e margem sobre o preço, com os mesmos
 * alertas de prejuízo/margem baixa do simulador. `custoCentavos` é o custo usado
 * no lucro (COGS no modo completo, custo de caixa no modo escala).
 */
export function calcularResultadoCanal(
  canal: CanalVenda,
  taxa: TaxaCanal,
  precoSugeridoCentavos: number | null,
  custoCentavos: number,
  margemMinimaPercentual: number
): ResultadoCanal {
  if (precoSugeridoCentavos === null) {
    return {
      canal,
      taxa,
      precoSugeridoCentavos: null,
      comissaoCentavos: null,
      lucroLiquidoCentavos: null,
      margemPercentual: null,
      prejuizo: false,
      margemBaixa: false,
    };
  }

  const comissaoCentavos = comissaoCanal(taxa, precoSugeridoCentavos);
  const lucroLiquidoCentavos = precoSugeridoCentavos - custoCentavos - comissaoCentavos;
  const margemPercentual = custoCentavos > 0 ? (lucroLiquidoCentavos / custoCentavos) * 100 : 0;

  return {
    canal,
    // Com faixas, a taxa mostrada é a da faixa do preço sugerido.
    taxa: taxaNoPreco(taxa, precoSugeridoCentavos),
    precoSugeridoCentavos,
    comissaoCentavos,
    lucroLiquidoCentavos,
    margemPercentual,
    prejuizo: lucroLiquidoCentavos < 0,
    margemBaixa: margemPercentual < margemMinimaPercentual,
  };
}

/** Preço mínimo e desconto máximo de um canal, a partir do preço atual, da taxa e da margem mínima efetiva (EDI-108). */
export interface ResultadoPisoCanal {
  canal: CanalVenda;
  /** `null` quando a taxa percentual do canal é `>= 100%`. */
  precoMinimoCentavos: number | null;
  /**
   * `null` nas mesmas condições de `precoMinimoCentavos`; pode ser negativo
   * quando o preço atual já está abaixo do mínimo — a UI decide como exibir
   * isso (aviso, não um desconto negativo real).
   */
  descontoMaximoCentavos: number | null;
  descontoMaximoPercentual: number | null;
}

/**
 * Preço mínimo (piso) de um canal: a mesma fórmula do preço sugerido, com a
 * margem mínima (% sobre o custo) no lugar da desejada. Retorna `null` quando
 * a taxa percentual é `>= 100%`.
 */
export function calcularPrecoMinimoCanal(
  custoCentavos: number,
  taxa: TaxaCanal,
  margemMinimaPercentual: number
): number | null {
  return calcularPrecoSugeridoCanal(custoCentavos, margemMinimaPercentual, taxa);
}

/**
 * Preço mínimo + desconto máximo (R$ e %) de um canal, a partir do preço
 * atual daquele canal (EDI-108). `precoMinimoCentavos` já calculado por
 * `calcularPrecoMinimoCanal` (evita recalcular o custo/taxa aqui).
 */
export function calcularResultadoPisoCanal(
  canal: CanalVenda,
  precoAtualCentavos: number,
  precoMinimoCentavos: number | null
): ResultadoPisoCanal {
  if (precoMinimoCentavos === null) {
    return {
      canal,
      precoMinimoCentavos: null,
      descontoMaximoCentavos: null,
      descontoMaximoPercentual: null,
    };
  }

  const descontoMaximoCentavos = precoAtualCentavos - precoMinimoCentavos;
  const descontoMaximoPercentual =
    precoAtualCentavos > 0 ? (descontoMaximoCentavos / precoAtualCentavos) * 100 : 0;

  return { canal, precoMinimoCentavos, descontoMaximoCentavos, descontoMaximoPercentual };
}

export interface EntradaComparativo {
  /** Custo-base do modo escolhido: COGS (completo) ou custo de caixa (escala). */
  custoBaseCentavos: number;
  modo: "completo" | "escala";
  /** Usado no modo completo. */
  margemDesejadaPercentual: number;
  /** Usado no modo escala, em centavos. */
  lucroEscalaCentavos: number;
  margemMinimaPercentual: number;
  /** Taxa do Mercado Livre (estimada ou derivada da comissão real). */
  mercadoLivre: TaxaCanal;
  shopee: TaxaCanal;
  siteProprio: TaxaCanal;
}

/** Resultado dos três canais lado a lado, na ordem Mercado Livre, Shopee, site próprio. */
export function calcularComparativoCanais(entrada: EntradaComparativo): ResultadoCanal[] {
  const canais: Array<[CanalVenda, TaxaCanal]> = [
    ["mercadoLivre", entrada.mercadoLivre],
    ["shopee", entrada.shopee],
    ["siteProprio", entrada.siteProprio],
  ];

  return canais.map(([canal, taxa]) => {
    const preco =
      entrada.modo === "escala"
        ? calcularPrecoEscalaCanal(entrada.custoBaseCentavos, entrada.lucroEscalaCentavos, taxa)
        : calcularPrecoSugeridoCanal(entrada.custoBaseCentavos, entrada.margemDesejadaPercentual, taxa);

    return calcularResultadoCanal(
      canal,
      taxa,
      preco,
      entrada.custoBaseCentavos,
      entrada.margemMinimaPercentual
    );
  });
}
