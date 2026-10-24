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
  /** "HH:MM" planejado para mandar para a impressora; ausente = ainda sem horário. */
  inicio?: string;
}

/**
 * Planejamento de impressão de um produto (specs/035) — independente do custo
 * de produção do cadastro e do status de publicação. Um por produto.
 */
export interface PlanoImpressao {
  _id?: ObjectId;
  produtoId: string;
  itens: ItemImpressao[];
  criadoEm: Date;
  atualizadoEm: Date;
}
