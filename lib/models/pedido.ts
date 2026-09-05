import type { ObjectId } from "mongodb";

export const PEDIDOS_COLLECTION = "pedidos";

export type StatusPedido = "pendente" | "pago" | "enviado" | "cancelado";
export type CanalOrigem = "site" | "shopee" | "mercado_livre";

export interface ItemPedido {
  produtoId: ObjectId;
  quantidade: number;
  /** Preço unitário capturado no momento da compra, em centavos. */
  precoUnitario: number;
}

export interface ClientePedido {
  nome: string;
  email: string;
  telefone?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
}

export type StatusTentativaPagamento = "pendente" | "aprovado" | "recusado" | "expirado";

export interface TentativaPagamento {
  /** ID do pagamento no Mercado Pago — chave usada para casar com o webhook. */
  referenciaExterna: string;
  /** `payment_method_id` retornado pelo Mercado Pago (ex: "visa", "pix"). */
  metodo: string;
  status: StatusTentativaPagamento;
  /** Valor em centavos no momento da tentativa — DEVE bater com `Pedido.valorTotal`. */
  valor: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface PagamentoPedido {
  /** Método da tentativa aprovada ou mais recente. */
  metodo?: string;
  /** Status da tentativa mais recente/relevante (leitura rápida sem varrer `tentativas`). */
  status?: StatusTentativaPagamento;
  /** ID do pagamento no Mercado Pago da tentativa aprovada (ou mais recente). */
  referenciaExterna?: string;
  tentativas: TentativaPagamento[];
}

export interface Pedido {
  _id?: ObjectId;
  itens: ItemPedido[];
  cliente: ClientePedido;
  status: StatusPedido;
  canalOrigem: CanalOrigem;
  /** Valor total do pedido, em centavos. */
  valorTotal: number;
  pagamento: PagamentoPedido;
  /**
   * Token de idempotência gerado pelo checkout (uma compra = um token).
   * Índice único esparso — garante que um mesmo envio nunca gere dois pedidos.
   */
  idempotencia?: string;
  /**
   * Presente apenas em pedidos originados fora do site (Tarefa 7/EDI-80).
   * `pedidoExternoId` é a chave de idempotência do webhook do canal — índice
   * único esparso, mesmo papel que `idempotencia` tem para o checkout do site.
   */
  origemExterna?: {
    canal: "mercado_livre" | "shopee";
    pedidoExternoId: string;
  };
  criadoEm: Date;
  atualizadoEm: Date;
}
