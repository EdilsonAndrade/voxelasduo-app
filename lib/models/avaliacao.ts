import type { ObjectId } from "mongodb";
import type { Canal } from "./estoqueSincronizacao";

export const AVALIACOES_COLLECTION = "avaliacoes";

/** `Canal` (Tarefa 5) já cobre `mercado_livre`/`shopee`; `"site"` é reservado para avaliações nativas do site, sem caminho de escrita nesta tarefa (spec.md, Assumptions). */
export type CanalAvaliacao = Canal | "site";

/**
 * Feedback de um cliente sobre um produto, importado de um canal externo
 * (ou, futuramente, nativo do site). `avaliacaoIdCanal` ausente apenas para
 * `canal: "site"` — para `mercado_livre`/`shopee` é a base do upsert
 * idempotente (data-model.md).
 */
export interface Avaliacao {
  _id?: ObjectId;
  produtoId: ObjectId;
  canal: CanalAvaliacao;
  avaliacaoIdCanal?: string;
  /** 1 a 5. */
  nota: number;
  comentario?: string;
  /** Data original da avaliação no canal — não a data de importação. */
  dataAvaliacao: Date;
  criadoEm: Date;
  atualizadoEm: Date;
}
