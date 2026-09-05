import type { ObjectId } from "mongodb";
import type { Canal } from "./estoqueSincronizacao";

export const PUBLICACOES_CANAL_FALHAS_COLLECTION = "publicacoesCanalFalhas";

export type OperacaoPublicacaoCanal = "criar" | "atualizar";

/**
 * Falha ao criar ou atualizar um anúncio em si (dados do anúncio) — distinto
 * de falha ao sincronizar apenas quantidade/preço (`RegistroSincronizacaoEstoque`,
 * Tarefa 5). Sem retry automático: a maioria dos motivos (categoria sem
 * mapeamento, dado obrigatório ausente) exige correção manual do cadastro
 * antes de qualquer nova tentativa fazer sentido (FR-011).
 */
export interface FalhaPublicacaoCanal {
  _id?: ObjectId;
  produtoId: ObjectId;
  canal: Canal;
  operacao: OperacaoPublicacaoCanal;
  motivo: string;
  criadoEm: Date;
  resolvidoEm?: Date;
}
