import type { AnuncioCalculadoraValores, CalculadoraValoresV2 } from "@/lib/models/calculoPreco";
import { valoresPadraoV2 } from "./calculadoraValores";

/**
 * Valores iniciais da calculadora de preço. Ficam fora de `CalculadoraRapida.tsx`
 * (`"use client"`) porque o servidor também monta cálculos — a pesquisa de
 * nichos cria um cálculo salvo a partir de um modelo do MakerWorld (specs/030).
 */
export const ANUNCIO_PADRAO: AnuncioCalculadoraValores = { modo: "sem", roasMeta: "8", verbaMesReais: "" };

export function valoresPadrao(): CalculadoraValoresV2 {
  return valoresPadraoV2();
}
