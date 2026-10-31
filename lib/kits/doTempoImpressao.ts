import type { ItemImpressao } from "@/lib/models/planoImpressao";
import { custoDaPeca } from "@/lib/producao/ganhoImpressao";
import { quantidadeDoItem } from "@/lib/producao/planosImpressao";

export interface PecaDoPlano {
  /** Peso de 1 peça (uma de cada parte), em gramas — `null` se alguma parte está sem peso. */
  pesoGramas: number | null;
  /** Tempo de 1 peça, em minutos — a placa dividida pelas peças que saem nela. */
  tempoMinutos: number;
  /** Margem do plano ponderada pelo custo de cada parte — `null` se alguma parte está sem margem ou sem custo. */
  margemPercentual: number | null;
}

/**
 * Uma unidade do item do Tempo de Impressão para o kit: uma peça de cada parte,
 * com peso e tempo da placa divididos pelas peças dela (placa com 10 = 1/10).
 */
export function pecaDoPlano(itens: ItemImpressao[]): PecaDoPlano {
  let peso = 0;
  let pesoCompleto = itens.length > 0;
  let minutos = 0;
  let custo = 0;
  let lucro = 0;
  let margemCompleta = itens.length > 0;

  for (const item of itens) {
    const quantidade = quantidadeDoItem(item);
    minutos += item.minutos / quantidade;
    if (item.pesoGramas === undefined) pesoCompleto = false;
    else peso += item.pesoGramas / quantidade;

    const custoPeca = item.pesoGramas !== undefined ? custoDaPeca({ minutos: item.minutos, quantidade, pesoGramas: item.pesoGramas }) : null;
    if (custoPeca === null || item.margemPercentual === undefined) {
      margemCompleta = false;
      continue;
    }
    custo += custoPeca;
    lucro += (custoPeca * item.margemPercentual) / 100;
  }

  return {
    pesoGramas: pesoCompleto && peso > 0 ? Math.round(peso * 10) / 10 : null,
    tempoMinutos: Math.max(1, Math.round(minutos)),
    margemPercentual: margemCompleta && custo > 0 ? Math.round((lucro / custo) * 1000) / 10 : null,
  };
}
