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

export interface PagamentoPedido {
  /** Detalhado na Tarefa 4 (integração Mercado Pago). */
  metodo?: string;
  status?: string;
  referenciaExterna?: string;
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
  criadoEm: Date;
  atualizadoEm: Date;
}
