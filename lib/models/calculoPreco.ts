import type { ObjectId } from "mongodb";
import type { CustoProducaoFormValores } from "@/lib/produtos/custoProducaoFormulario";

export const CALCULOS_PRECO_COLLECTION = "calculosPreco";

export interface CanalCalculadoraValores {
  taxaPercentual: string;
  taxaFixaReais: string;
  anuncioPercentual: string;
}

/**
 * Tudo o que foi digitado na calculadora de preço, como texto — guardado assim
 * para reabrir o cálculo exatamente como estava, ainda antes de virar produto.
 */
export interface CalculadoraValores {
  custo: CustoProducaoFormValores;
  margemPercentual: string;
  canais: { shopee: CanalCalculadoraValores; mercadoLivre: CanalCalculadoraValores };
  producao: { pecasPorMesa: string; horasMesaCheia: string; horasPorDia: string; diasPorMes: string };
  pecasPorMes: string;
}

/** Cálculo de viabilidade salvo — um estudo de preço que ainda pode (ou não) virar produto. */
export interface CalculoPreco {
  _id?: ObjectId;
  nome: string;
  linkModelo3d?: string;
  valores: CalculadoraValores;
  /** Produto rascunho criado a partir deste cálculo — ausente = ainda não virou produto. */
  produtoId?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
