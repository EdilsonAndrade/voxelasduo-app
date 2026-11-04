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
  /** Lucro desejado em % do preço de venda (margem líquida, EDI-137). */
  margemPercentual: number;
}

export interface GanhoCanal {
  canal: CanalMontado;
  /** Custo da peça + custos do pedido (frete grátis, cupom próprio). */
  custoPedidoCentavos: number;
  /** % do preço reservado para anúncio pago neste canal (0 = sem anúncio). */
  anuncioPercentual: number;
  /** Preço que deixa a margem pedida — `null` = impossível nesse canal. */
  precoCentavos: number | null;
  /** Anúncio pago no preço — `null` junto com o preço. */
  anuncioCentavos: number | null;
  /** O que sobra de verdade nesse preço, já sem taxas, anúncio e imposto. */
  lucroCentavos: number | null;
}

export interface Ganho {
  /** Custo de uma peça (ou do conjunto), com os padrões da calculadora de preço. */
  custoCentavos: number;
  /** Margem pedida, em % do preço (no conjunto, a média ponderada pelo custo de cada parte). */
  margemPercentual: number;
  /** Margem com folga para descontos na Shopee — `null` = sem folga (sempre maior que `margemPercentual`). */
  margemDescontosPercentual: number | null;
  canais: Record<CanalGanho, GanhoCanal | null>;
}

/** Canais em que o anúncio pago entra: só os marketplaces (a venda direta não tem Ads). */
const CANAIS_COM_ANUNCIO: CanalGanho[] = ["shopee"];

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

function detalhar(canal: GanhoCanal, precoCentavos: number) {
  return detalharVenda({
    precoCentavos,
    faixas: canal.canal.faixas,
    custoCentavos: canal.custoPedidoCentavos,
    anuncioPercentual: canal.anuncioPercentual,
    impostoPercentual: IMPOSTO_PERCENTUAL,
  });
}

/** Lucro em centavos num preço, com as taxas, o anúncio e o imposto padrão do canal. */
export function lucroNoPreco(canal: GanhoCanal, precoCentavos: number): number {
  return detalhar(canal, precoCentavos).lucroCentavos;
}

/**
 * Preço em cada canal para sobrar `margemPercentual` do preço depois de custo,
 * taxas, anúncio e imposto — a mesma conta da calculadora (faixas da Shopee,
 * pagamento e frete da venda direta). O anúncio só entra nos marketplaces.
 */
export function calcularGanho(
  custoCentavos: number,
  margemPercentual: number,
  anuncioPercentual = 0,
  margemDescontosPercentual: number | null = null
): Ganho {
  // Folga só vale acima do "quero ganhar" e abaixo de 100%.
  const folga =
    margemDescontosPercentual !== null && margemDescontosPercentual > margemPercentual && margemDescontosPercentual < 100
      ? margemDescontosPercentual
      : null;

  function noCanal(nome: CanalGanho): GanhoCanal | null {
    const canal = montarCanal(nome, PADRAO);
    if (!canal) return null;
    const marketplace = CANAIS_COM_ANUNCIO.includes(nome);
    const anuncio = marketplace ? anuncioPercentual : 0;
    const margemPreco = marketplace && folga !== null ? folga : margemPercentual;
    const custoPedidoCentavos = custoCentavos + canal.custoVendaCentavos;
    const precoCentavos = calcularPrecoPorMargem({
      custoCentavos: custoPedidoCentavos,
      faixas: canal.faixas,
      margemPrecoPercentual: margemPreco,
      anuncioPercentual: anuncio,
      impostoPercentual: IMPOSTO_PERCENTUAL,
    });
    const base: GanhoCanal = {
      canal,
      custoPedidoCentavos,
      anuncioPercentual: anuncio,
      precoCentavos,
      anuncioCentavos: null,
      lucroCentavos: null,
    };
    if (precoCentavos === null) return base;
    const venda = detalhar(base, precoCentavos);
    return { ...base, anuncioCentavos: venda.anuncioCentavos, lucroCentavos: venda.lucroCentavos };
  }

  return {
    custoCentavos,
    margemPercentual,
    margemDescontosPercentual: folga,
    canais: { shopee: noCanal("shopee"), direta: noCanal("direta") },
  };
}

function margemValida(margem: number): boolean {
  return Number.isFinite(margem) && margem >= 0 && margem < 100;
}

/** Ganho de uma peça da placa — `null` enquanto faltar tempo, peso ou margem válida. */
export function ganhoDaPlaca(
  placa: PlacaGanho,
  anuncioPercentual = 0,
  margemDescontosPercentual: number | null = null
): Ganho | null {
  const custo = custoDaPeca(placa);
  if (custo === null || !margemValida(placa.margemPercentual)) return null;
  return calcularGanho(custo, placa.margemPercentual, anuncioPercentual, margemDescontosPercentual);
}

/**
 * Ganho do conjunto (uma peça de cada placa, numa embalagem só): custos somados
 * e margem média ponderada pelo custo de cada parte. `null` se alguma parte
 * ainda não tem o cálculo.
 */
export function ganhoDoConjunto(
  placas: PlacaGanho[],
  anuncioPercentual = 0,
  margemDescontosPercentual: number | null = null
): Ganho | null {
  if (placas.length === 0) return null;
  let custo = 0;
  let ponderada = 0;
  for (const placa of placas) {
    const custoPeca = custoDaPeca(placa);
    if (custoPeca === null || !margemValida(placa.margemPercentual)) return null;
    custo += custoPeca;
    ponderada += custoPeca * placa.margemPercentual;
  }
  const margem = custo > 0 ? ponderada / custo : 0;
  return calcularGanho(custo - EMBALAGEM_CENTAVOS * (placas.length - 1), margem, anuncioPercentual, margemDescontosPercentual);
}
