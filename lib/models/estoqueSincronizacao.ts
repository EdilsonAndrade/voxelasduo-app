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
  /** Ausente quando a sincronização é disparada por uma edição de produto no admin (Tarefa 7/EDI-80), não por uma venda. */
  pedidoId?: ObjectId;
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
 * `produtoId`/`pedidoId` ficam ausentes quando o item vem de um pedido de
 * canal externo sem produto correspondente no catálogo do site (Tarefa
 * 7/EDI-80, FR-012) — nesse caso `origemExterna` identifica o item.
 */
export interface InconsistenciaEstoque {
  _id?: ObjectId;
  produtoId?: ObjectId;
  pedidoId?: ObjectId;
  origemExterna?: { canal: Canal; pedidoExternoId: string; itemIdCanal: string };
  quantidadeSolicitada: number;
  motivo: MotivoInconsistenciaEstoque;
  criadoEm: Date;
  resolvidoEm?: Date;
}
