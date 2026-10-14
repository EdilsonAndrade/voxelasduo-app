import type { AnuncioCalculadoraValores, CalculadoraValores } from "@/lib/models/calculoPreco";
import { VAZIO_CUSTO_PRODUCAO } from "./custoProducaoFormulario";

/**
 * Valores iniciais da calculadora de preço. Ficam fora de `CalculadoraRapida.tsx`
 * (`"use client"`) porque o servidor também monta cálculos — a pesquisa de
 * nichos cria um cálculo salvo a partir de um modelo do MakerWorld (specs/030).
 */
export const ANUNCIO_PADRAO: AnuncioCalculadoraValores = { modo: "sem", roasMeta: "8", verbaMesReais: "" };

export function valoresPadrao(): CalculadoraValores {
  return {
    // Filamento é digitado por kg: o carretel de referência fica fixo em 1000 g.
    custo: { ...VAZIO_CUSTO_PRODUCAO, pesoCarreteGramas: "1000", margemPerdaPercentual: "0" },
    margemMinimaPrecoPercentual: "25",
    anuncio: ANUNCIO_PADRAO,
    canais: {
      shopee: { taxaPercentual: "20", taxaFixaReais: "4.50", taxaPorFaixa: true },
      mercadoLivre: { taxaPercentual: "14", taxaFixaReais: "6.50" },
    },
    producao: { pecasPorMesa: "", horasMesaCheia: "", horasPorDia: "20", diasPorMes: "30" },
    pecasPorMes: "",
  };
}
