import { calcularPrecoPorMargem, detalharVenda } from "@/lib/produtos/calculadoraRapida";
import { valoresPadrao } from "@/lib/produtos/calculadoraPadrao";
import { montarCanal, type CanalMontado } from "@/lib/produtos/canaisCalculadora";
import { calcularCustoUnidade } from "@/lib/produtos/custoCalculadora";

/** Canais do Tempo de Impressão: por enquanto só Shopee e venda direta. */
export type CanalGanho = "shopee" | "direta";
export const CANAIS_GANHO: CanalGanho[] = ["shopee", "direta"];

/** Uma placa como a tela edita: tempo e peso da impressão toda (como o fatiador mostra). */
export interface PlacaGanho {
  minutos: number;
  quantidade: number;
  /** Peso da placa inteira, em gramas. */
  pesoGramas: number;
  /** Ganho desejado, em % sobre o custo de uma peça. */
  margemPercentual: number;
}

export interface GanhoCanal {
  canal: CanalMontado;
  /** Custo da peça + custos do pedido (frete grátis, cupom próprio). */
  custoPedidoCentavos: number;
  /** Preço que deixa o ganho desejado — `null` = impossível nesse canal. */
  precoCentavos: number | null;
  /** O que sobra de verdade nesse preço, já sem taxas e imposto. */
  lucroCentavos: number | null;
}

export interface Ganho {
  /** Custo de uma peça (ou do conjunto), com os padrões da calculadora de preço. */
  custoCentavos: number;
  /** Ganho pedido: custo × margem. */
  lucroDesejadoCentavos: number;
  canais: Record<CanalGanho, GanhoCanal | null>;
}

const PADRAO = valoresPadrao();
const EMBALAGEM_CENTAVOS = Math.round(Number(PADRAO.impressao.embalagemReais) * 100);
const IMPOSTO_PERCENTUAL = Number(PADRAO.precificacao.impostoPercentual) || 0;

/** Custo de uma peça da placa (material, energia, desgaste, falha e embalagem) — `null` sem tempo ou peso. */
export function custoDaPeca(placa: Pick<PlacaGanho, "minutos" | "quantidade" | "pesoGramas">): number | null {
  if (!(placa.minutos > 0) || !(placa.quantidade >= 1) || !(placa.pesoGramas > 0)) return null;
  const custo = calcularCustoUnidade({
    ...PADRAO.impressao,
    pecasPorMesa: String(Math.floor(placa.quantidade)),
    tempoHoras: String(Math.floor(placa.minutos / 60)),
    tempoMinutos: String(placa.minutos % 60),
    pesoGramas: String(placa.pesoGramas),
  });
  return custo?.totalCentavos ?? null;
}

/** Lucro em centavos num preço, com as taxas e o imposto padrão do canal. */
export function lucroNoPreco(canal: GanhoCanal, precoCentavos: number): number {
  return detalharVenda({
    precoCentavos,
    faixas: canal.canal.faixas,
    custoCentavos: canal.custoPedidoCentavos,
    anuncioPercentual: 0,
    impostoPercentual: IMPOSTO_PERCENTUAL,
  }).lucroCentavos;
}

/**
 * Preço em cada canal para sobrar `lucroDesejado` depois das taxas: o ganho
 * entra como custo e a margem sobre o preço fica zero — a mesma conta da
 * calculadora (faixas da Shopee, pagamento e frete da venda direta).
 */
export function calcularGanho(custoCentavos: number, lucroDesejadoCentavos: number): Ganho {
  function noCanal(nome: CanalGanho): GanhoCanal | null {
    const canal = montarCanal(nome, PADRAO);
    if (!canal) return null;
    const custoPedidoCentavos = custoCentavos + canal.custoVendaCentavos;
    const precoCentavos = calcularPrecoPorMargem({
      custoCentavos: custoPedidoCentavos + lucroDesejadoCentavos,
      faixas: canal.faixas,
      margemPrecoPercentual: 0,
      anuncioPercentual: 0,
      impostoPercentual: IMPOSTO_PERCENTUAL,
    });
    const resultado: GanhoCanal = { canal, custoPedidoCentavos, precoCentavos, lucroCentavos: null };
    return { ...resultado, lucroCentavos: precoCentavos === null ? null : lucroNoPreco(resultado, precoCentavos) };
  }

  return { custoCentavos, lucroDesejadoCentavos, canais: { shopee: noCanal("shopee"), direta: noCanal("direta") } };
}

/** Ganho de uma peça da placa — `null` enquanto faltar tempo, peso ou margem. */
export function ganhoDaPlaca(placa: PlacaGanho): Ganho | null {
  const custo = custoDaPeca(placa);
  if (custo === null || !(placa.margemPercentual >= 0)) return null;
  return calcularGanho(custo, Math.round((custo * placa.margemPercentual) / 100));
}

/**
 * Ganho do conjunto (uma peça de cada placa, numa embalagem só): os custos e os
 * ganhos de cada parte somados. `null` se alguma parte ainda não tem o cálculo.
 */
export function ganhoDoConjunto(placas: PlacaGanho[]): Ganho | null {
  if (placas.length === 0) return null;
  let custo = 0;
  let lucro = 0;
  for (const placa of placas) {
    const custoPeca = custoDaPeca(placa);
    if (custoPeca === null || !(placa.margemPercentual >= 0)) return null;
    custo += custoPeca;
    lucro += Math.round((custoPeca * placa.margemPercentual) / 100);
  }
  return calcularGanho(custo - EMBALAGEM_CENTAVOS * (placas.length - 1), lucro);
}
