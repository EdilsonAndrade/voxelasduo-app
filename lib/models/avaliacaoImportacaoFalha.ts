import type { ObjectId } from "mongodb";
import type { Canal } from "./estoqueSincronizacao";

export const AVALIACOES_IMPORTACAO_FALHAS_COLLECTION = "avaliacoesImportacaoFalhas";

/**
 * Falha ao buscar avaliações de um canal externo — sem retry automático,
 * consultável para revisão manual (FR-006), mesmo padrão de
 * `FalhaPublicacaoCanal` (Tarefa 7).
 */
export interface FalhaImportacaoAvaliacao {
  _id?: ObjectId;
  canal: Canal;
  /** Ausente quando a falha é geral do canal (ex: token inválido), antes de resolver qualquer produto. */
  produtoId?: ObjectId;
  motivo: string;
  criadoEm: Date;
  resolvidoEm?: Date;
}
