import type { ObjectId } from "mongodb";

export const ENCOMENDAS_COLLECTION = "encomendas";

/** Pedido de impressão 3D sob encomenda, enviado pelo formulário público de /encomendas. */
export interface Encomenda {
  _id?: ObjectId;
  nome: string;
  /** Sempre normalizado em minúsculas antes de gravar. */
  email: string;
  /** Somente dígitos, com DDD (10 ou 11 dígitos). */
  telefone: string;
  descricao: string;
  criadoEm: Date;
}
