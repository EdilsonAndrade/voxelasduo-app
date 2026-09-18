import type { ObjectId } from "mongodb";

export const PERGUNTAS_MERCADO_LIVRE_COLLECTION = "perguntas_mercado_livre";
export const RECLAMACOES_MERCADO_LIVRE_COLLECTION = "reclamacoes_mercado_livre";
export const MENSAGENS_MERCADO_LIVRE_COLLECTION = "mensagens_mercado_livre";

/**
 * Pergunta feita num anúncio do Mercado Livre (tópico `questions`, EDI-98).
 * `perguntaId` tem índice único esparso — garante idempotência quando o
 * Mercado Livre reenvia a mesma notificação (data-model.md).
 */
export interface PerguntaMercadoLivre {
  _id?: ObjectId;
  perguntaId: string;
  itemId: string;
  produtoId?: ObjectId;
  texto: string;
  status: "pendente" | "respondida";
  linkOrigem: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Reclamação aberta numa venda do Mercado Livre (tópicos `claims`/`claims_actions`).
 * Vinculada ao pedido existente via `pedidoExternoId`, mesmo campo usado por
 * `origemExterna.pedidoExternoId` em `Pedido` (research.md #6).
 */
export interface ReclamacaoMercadoLivre {
  _id?: ObjectId;
  reclamacaoId: string;
  pedidoExternoId?: string;
  pedidoId?: ObjectId;
  motivo: string;
  status: "aberta" | "fechada";
  linkOrigem: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/** Mensagem pós-venda trocada com um comprador no Mercado Livre (tópico `messages`). */
export interface MensagemPosVendaMercadoLivre {
  _id?: ObjectId;
  mensagemId: string;
  pedidoExternoId?: string;
  pedidoId?: ObjectId;
  texto: string;
  status: "pendente" | "respondida";
  linkOrigem: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
