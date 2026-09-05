import type { ObjectId } from "mongodb";

export const SINCRONIZACOES_ESTOQUE_COLLECTION = "sincronizacoesEstoque";
export const ESTOQUE_INCONSISTENCIAS_COLLECTION = "estoqueInconsistencias";

export type Canal = "mercado_livre" | "shopee";
export type StatusSincronizacaoEstoque = "pendente" | "sincronizado" | "falhou";

/**
 * Fila e log de sincronização de estoque com um canal externo. Um canal sem
 * credencial/mapeamento configurado nunca gera um registro aqui (FR-007) —
 * ausência de registro, não um estado "ignorado".
 */
export interface RegistroSincronizacaoEstoque {
  _id?: ObjectId;
  produtoId: ObjectId;
  pedidoId: ObjectId;
  canal: Canal;
  /** Novo valor de `estoque` a refletir no canal (não um delta). */
  quantidade: number;
  status: StatusSincronizacaoEstoque;
  tentativas: number;
  proximaTentativaEm: Date;
  ultimoErro?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export type MotivoInconsistenciaEstoque = "estoque_insuficiente" | "produto_removido";

/**
 * Registrado quando o abatimento atômico falha (pagamento já aprovado,
 * não pode ser desfeito automaticamente) — fica para revisão manual (FR-004).
 */
export interface InconsistenciaEstoque {
  _id?: ObjectId;
  produtoId: ObjectId;
  pedidoId: ObjectId;
  quantidadeSolicitada: number;
  motivo: MotivoInconsistenciaEstoque;
  criadoEm: Date;
  resolvidoEm?: Date;
}
