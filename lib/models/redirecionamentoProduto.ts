import type { ObjectId } from "mongodb";

export const REDIRECIONAMENTOS_PRODUTOS_COLLECTION = "redirecionamentosProdutos";

/**
 * Endereço antigo de um produto (`/produtos/{categoria}/{slug}`) que deve
 * levar ao endereço atual — gravado quando a categoria ou o slug do produto
 * mudam (EDI-123). Aponta para o `produtoId`, não para a URL de destino, para
 * que várias trocas seguidas resolvam sempre em um único redirecionamento.
 */
export interface RedirecionamentoProduto {
  _id?: ObjectId;
  /** Segmento de categoria antigo, já decodificado. */
  categoria: string;
  slug: string;
  produtoId: ObjectId;
  criadoEm: Date;
}
