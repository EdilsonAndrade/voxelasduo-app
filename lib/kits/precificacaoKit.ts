import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import type { ValoresComponente } from "@/lib/models/kit";
import { faixasMercadoLivre } from "@/lib/produtos/calculadoraRapida";
import {
  calcularPrecoSugeridoCanal,
  comissaoCanal,
  resolverTaxasCanais,
  type CanalVenda,
  type TaxaCanal,
} from "@/lib/produtos/canais";

/** Comissão estimada do Mercado Livre — o mesmo padrão da calculadora (14% + R$ 6,50 abaixo de R$ 79). */
export const ML_PERCENTUAL_ESTIMADO = 14;
export const ML_FIXA_ABAIXO_79_CENTAVOS = 650;

export interface CanalKit {
  canal: CanalVenda;
  rotulo: string;
  taxa: TaxaCanal;
}

/** Site (taxas da loja), Shopee (tabela por faixa) e Mercado Livre (estimativa), nessa ordem. */
export function canaisDoKit(taxasGlobais: TaxasCanaisConfig): CanalKit[] {
  const efetivas = resolverTaxasCanais(taxasGlobais);
  const faixasMl = faixasMercadoLivre(ML_PERCENTUAL_ESTIMADO, ML_FIXA_ABAIXO_79_CENTAVOS);
  return [
    { canal: "siteProprio", rotulo: "Site", taxa: efetivas.siteProprio },
    { canal: "shopee", rotulo: "Shopee", taxa: efetivas.shopee },
    {
      canal: "mercadoLivre",
      rotulo: "Mercado Livre",
      taxa: { percentual: ML_PERCENTUAL_ESTIMADO, fixaCentavos: ML_FIXA_ABAIXO_79_CENTAVOS, faixas: faixasMl },
    },
  ];
}

/**
 * Valor de uma peça no kit: `custo × (1 + margem)` quando há margem e custo;
 * senão o preço avulso do site.
 */
export function valorDoItem(valores: ValoresComponente, margemPercentual?: number | null): number {
  if (margemPercentual === null || margemPercentual === undefined || valores.custoCentavos === null) {
    return valores.precoCentavos;
  }
  return Math.round(valores.custoCentavos * (1 + margemPercentual / 100));
}

export interface TotaisKit {
  /** Soma dos valores dos itens (preço avulso ou custo + margem) × quantidade. */
  somaAvulsaCentavos: number;
  /** Custo das peças (sem embalagem) × quantidade + embalagem do kit. */
  custoCentavos: number;
  pesoGramas: number;
  tempoMinutos: number;
  quantidadePecas: number;
  pesoIncompleto: boolean;
  tempoIncompleto: boolean;
  /** Algum componente sem custo cadastrado — a margem é uma estimativa por baixo. */
  custoIncompleto: boolean;
}

export function calcularTotaisKit(
  itens: { quantidade: number; valores: ValoresComponente; margemPercentual?: number | null }[],
  embalagemCentavos: number
): TotaisKit {
  const totais: TotaisKit = {
    somaAvulsaCentavos: 0,
    custoCentavos: itens.length > 0 ? Math.max(0, Math.round(embalagemCentavos)) : 0,
    pesoGramas: 0,
    tempoMinutos: 0,
    quantidadePecas: 0,
    pesoIncompleto: false,
    tempoIncompleto: false,
    custoIncompleto: false,
  };
  for (const { quantidade, valores, margemPercentual } of itens) {
    totais.quantidadePecas += quantidade;
    totais.somaAvulsaCentavos += valorDoItem(valores, margemPercentual) * quantidade;
    if (valores.pesoGramas === null) totais.pesoIncompleto = true;
    else totais.pesoGramas += valores.pesoGramas * quantidade;
    if (valores.tempoMinutos === null) totais.tempoIncompleto = true;
    else totais.tempoMinutos += valores.tempoMinutos * quantidade;
    if (valores.custoCentavos === null) totais.custoIncompleto = true;
    else totais.custoCentavos += valores.custoCentavos * quantidade;
  }
  return totais;
}

export interface MargemCanal {
  canal: CanalVenda;
  rotulo: string;
  comissaoCentavos: number;
  lucroCentavos: number;
  /** Lucro em % do preço. */
  margemPercentual: number;
  abaixoDoPiso: boolean;
}

/** Lucro e margem (% do preço) de cada canal num preço, com o piso de lucro da loja. */
export function margensNoPreco(
  precoCentavos: number,
  custoCentavos: number,
  canais: CanalKit[],
  pisoPercentual: number
): MargemCanal[] {
  return canais.map(({ canal, rotulo, taxa }) => {
    const comissaoCentavos = precoCentavos > 0 ? comissaoCanal(taxa, precoCentavos) : 0;
    const lucroCentavos = precoCentavos - custoCentavos - comissaoCentavos;
    const margemPercentual = precoCentavos > 0 ? (lucroCentavos / precoCentavos) * 100 : 0;
    return {
      canal,
      rotulo,
      comissaoCentavos,
      lucroCentavos,
      margemPercentual,
      // Tolerância de arredondamento: ficar exatamente no piso não é "abaixo".
      abaixoDoPiso: precoCentavos <= 0 || margemPercentual < pisoPercentual - 0.005,
    };
  });
}

export interface AvaliacaoPreco {
  precoCentavos: number;
  economiaCentavos: number;
  /** Desconto real sobre a soma avulsa, em %. */
  descontoPercentual: number;
  margens: MargemCanal[];
  /** O preço do kit é o preço do site: abaixo do piso no site = não deixa escolher a faixa. */
  bloqueada: boolean;
  /** Preço igual ou maior que a soma avulsa — o kit não sai mais em conta. */
  naoEstaEmConta: boolean;
}

export function avaliarPreco(
  precoCentavos: number,
  totais: TotaisKit,
  canais: CanalKit[],
  pisoPercentual: number
): AvaliacaoPreco {
  const margens = margensNoPreco(precoCentavos, totais.custoCentavos, canais, pisoPercentual);
  const economiaCentavos = totais.somaAvulsaCentavos - precoCentavos;
  return {
    precoCentavos,
    economiaCentavos,
    descontoPercentual: totais.somaAvulsaCentavos > 0 ? (economiaCentavos / totais.somaAvulsaCentavos) * 100 : 0,
    margens,
    bloqueada: margens.find((m) => m.canal === "siteProprio")?.abaixoDoPiso ?? true,
    naoEstaEmConta: precoCentavos >= totais.somaAvulsaCentavos,
  };
}

export interface SugestaoFaixa extends AvaliacaoPreco {
  faixaPercentual: number;
}

/** Preço do kit em cada faixa: `soma avulsa × (1 − desconto)`, com a margem de cada canal. */
export function sugerirFaixas(
  totais: TotaisKit,
  faixas: number[],
  canais: CanalKit[],
  pisoPercentual: number
): SugestaoFaixa[] {
  if (totais.somaAvulsaCentavos <= 0) return [];
  return faixas.map((faixaPercentual) => ({
    faixaPercentual,
    ...avaliarPreco(Math.round(totais.somaAvulsaCentavos * (1 - faixaPercentual / 100)), totais, canais, pisoPercentual),
  }));
}

/**
 * Preço sugerido de uma peça nova vendida sozinha no site: custo com a
 * embalagem da peça, margem desejada da loja e a taxa do site. `null` = taxa +
 * margem `>= 100%`.
 */
export function precoSugeridoItemNovo(custoComEmbalagemCentavos: number, taxasGlobais: TaxasCanaisConfig): number | null {
  return calcularPrecoSugeridoCanal(
    custoComEmbalagemCentavos,
    taxasGlobais.margemDesejadaPercentual,
    resolverTaxasCanais(taxasGlobais).siteProprio
  );
}
