import type { ObjectId } from "mongodb";

/** Pedidos anotados em eventos presenciais (EDI-125) — separados das encomendas do site. */
export const PEDIDOS_EVENTO_COLLECTION = "pedidosEvento";
export const EVENTOS_COLLECTION = "eventos";

export const STATUS_PEDIDO_EVENTO = ["anotado", "orcado", "em_producao", "pronto", "entregue"] as const;
export type StatusPedidoEvento = (typeof STATUS_PEDIDO_EVENTO)[number];

export const ROTULO_STATUS_PEDIDO_EVENTO: Record<StatusPedidoEvento, string> = {
  anotado: "Anotado",
  orcado: "Orçado",
  em_producao: "Em produção",
  pronto: "Pronto",
  entregue: "Entregue",
};

export const LIMITES_PEDIDO_EVENTO = {
  eventoMin: 2,
  eventoMax: 60,
  nomeMin: 2,
  nomeMax: 60,
  itensMax: 30,
  descricaoMax: 200,
  quantidadeMin: 1,
  quantidadeMax: 999,
  fotosPorItem: 3,
  observacaoMax: 500,
  valorMaxCentavos: 10_000_000,
} as const;

export interface ItemPedidoEvento {
  id: string;
  descricao: string;
  quantidade: number;
  fotos: string[];
}

export interface AutorPedidoEvento {
  id: string;
  nome: string;
}

/** Corpo enviado pelo aparelho (fila offline) ao `PUT /api/admin/evento/pedidos/[id]`. */
export interface PedidoEventoPayload {
  evento: string;
  cliente: { nome: string; telefone: string };
  itens: ItemPedidoEvento[];
  valorCentavos: number | null;
  observacao: string;
  status: StatusPedidoEvento;
  /** Quando foi anotado no aparelho (ISO). */
  criadoEm: string;
}

export interface PedidoEvento {
  /** UUID gerado no aparelho — garante que reenvios da fila não dupliquem o pedido. */
  _id: string;
  eventoId: ObjectId;
  evento: string;
  cliente: { nome: string; telefone: string };
  itens: ItemPedidoEvento[];
  valorCentavos: number | null;
  observacao: string;
  status: StatusPedidoEvento;
  criadoPor: AutorPedidoEvento;
  atualizadoPor: AutorPedidoEvento;
  criadoEm: Date;
  atualizadoEm: Date;
  recebidoEm: Date;
}

export interface Evento {
  _id?: ObjectId;
  nome: string;
  nomeNormalizado: string;
  criadoEm: Date;
  ultimoUsoEm: Date;
}

/** Formato serializado (JSON) devolvido pela API e usado na tela. */
export interface PedidoEventoJson extends Omit<PedidoEvento, "eventoId" | "criadoEm" | "atualizadoEm" | "recebidoEm"> {
  eventoId: string;
  criadoEm: string;
  atualizadoEm: string;
}
