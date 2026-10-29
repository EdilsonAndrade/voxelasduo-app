import type { ObjectId } from "mongodb";

export const PLANOS_IMPRESSAO_COLLECTION = "planosImpressao";

/** Uma parte do produto — ou o produto inteiro, quando sai numa placa só. */
export interface ItemImpressao {
  /** Estável entre edições: é o que a tela usa como chave da linha. */
  id: string;
  nome: string;
  /** Tempo de impressão da placa, em minutos inteiros. */
  minutos: number;
  /** Peças que saem nessa placa (ex.: 5 pares de botas). Ausente = 1 (planos antigos). */
  quantidade?: number;
  /** Peso da placa inteira em gramas, como o fatiador mostra; ausente = ainda sem peso. */
  pesoGramas?: number;
  /** Ganho desejado em % sobre o custo de uma peça; ausente = ainda sem margem. */
  margemPercentual?: number;
  /** "HH:MM" planejado para mandar para a impressora; ausente = ainda sem horário. */
  inicio?: string;
}

/**
 * Planejamento de impressão (specs/035) — independente do custo de produção do
 * cadastro e do status de publicação.
 *
 * Ligado a um produto do catálogo (`produtoId`, no máximo um plano por produto)
 * ou avulso, só com `nome`: algo que ainda não virou produto e pode ir para a
 * calculadora ou virar produto depois (o plano passa então a ter `produtoId`).
 */
export interface PlanoImpressao {
  _id?: ObjectId;
  produtoId?: string;
  /** Nome do item avulso — ignorado quando há `produtoId` (vale o nome do produto). */
  nome?: string;
  itens: ItemImpressao[];
  criadoEm: Date;
  atualizadoEm: Date;
}
