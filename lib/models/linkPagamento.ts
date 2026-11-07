import type { ObjectId } from "mongodb";

export const LINKS_PAGAMENTO_COLLECTION = "linksPagamento";

/** Validade padrão de um link novo, em dias. */
export const VALIDADE_PADRAO_DIAS = 7;
export const VALIDADE_MAXIMA_DIAS = 60;
export const MAXIMO_ITENS_LINK = 30;
export const LIMITE_TEXTO_LINK = 120;

/** Item do link com o preço combinado com o cliente (centavos). */
export interface ItemLinkPagamento {
  produtoId: ObjectId;
  /** Variação de kit (specs/041) — ausente = produto simples. */
  variacaoId?: string;
  /** Nome no momento da criação, já com a variação ("Produto — Kit 4"). */
  nome: string;
  foto?: string;
  quantidade: number;
  /** Preço unitário do site quando o link foi criado. */
  precoOriginalCentavos: number;
  /** Preço unitário combinado (com o desconto). */
  precoCentavos: number;
}

/**
 * Link de pagamento montado no admin: um carrinho fechado, com preço por item,
 * que o cliente paga pelo checkout do site. Vale para uma compra só.
 */
export interface LinkPagamento {
  _id?: ObjectId;
  /** Parte pública da URL: /pagar/{codigo}. */
  codigo: string;
  clienteNome?: string;
  /** Recado exibido ao cliente na página do link. */
  observacao?: string;
  itens: ItemLinkPagamento[];
  freteGratis: boolean;
  validoAte: Date;
  canceladoEm?: Date;
  /** Pedido gerado pelo link — presente = link já usado. */
  pedidoId?: ObjectId;
  criadoEm: Date;
  atualizadoEm: Date;
}

export type SituacaoLink = "ativo" | "vencido" | "cancelado" | "aguardando_pagamento" | "pago";

export const ROTULO_SITUACAO_LINK: Record<SituacaoLink, string> = {
  ativo: "Ativo",
  vencido: "Vencido",
  cancelado: "Cancelado",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
};
