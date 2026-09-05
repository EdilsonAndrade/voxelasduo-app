import { MongoServerError, ObjectId } from "mongodb";
import type { ClientePedido, Pedido } from "@/lib/models/pedido";
import { colecaoPedidos } from "./repository";

export interface ItemPedidoExterno {
  produtoId: ObjectId;
  quantidade: number;
  precoUnitario: number;
}

export interface PedidoExternoInput {
  canal: "mercado_livre" | "shopee";
  pedidoExternoId: string;
  itens: ItemPedidoExterno[];
  cliente?: ClientePedido;
}

export interface PedidoExternoResultado {
  pedido: Pedido;
  /** `true` só quando esta chamada de fato criou o pedido (primeira notificação). */
  criado: boolean;
}

/** Sem dados de comprador relevantes ao site — o canal externo já cuida da comunicação/envio com o comprador. */
const CLIENTE_PLACEHOLDER: ClientePedido = {
  nome: "Venda originada em canal externo",
  email: "vendas-externas@voxelasduo.local",
  endereco: {
    logradouro: "-",
    numero: "-",
    bairro: "-",
    cidade: "-",
    estado: "-",
    cep: "-",
  },
};

/**
 * Upsert idempotente de um pedido nascido em canal externo (Tarefa 7/EDI-80,
 * research.md #1, #2) — mesma técnica já usada para `idempotencia` no
 * checkout do site (`criarPedido`, Tarefa 3): tenta inserir, e uma corrida
 * entre duas notificações da mesma venda é resolvida pelo índice único
 * esparso em `origemExterna.pedidoExternoId` (erro 11000), não por uma
 * leitura prévia sozinha.
 */
export async function upsertPedidoExterno(
  input: PedidoExternoInput
): Promise<PedidoExternoResultado> {
  const colecao = await colecaoPedidos();

  const existente = await colecao.findOne({
    "origemExterna.pedidoExternoId": input.pedidoExternoId,
  });
  if (existente) {
    return { pedido: existente, criado: false };
  }

  const valorTotal = input.itens.reduce(
    (acc, item) => acc + item.precoUnitario * item.quantidade,
    0
  );

  const agora = new Date();
  const pedido: Omit<Pedido, "_id"> = {
    itens: input.itens,
    cliente: input.cliente ?? CLIENTE_PLACEHOLDER,
    // O canal só notifica vendas já pagas — sem estados intermediários a acompanhar (data-model.md #2).
    status: "pago",
    canalOrigem: input.canal,
    valorTotal,
    pagamento: { tentativas: [] },
    origemExterna: { canal: input.canal, pedidoExternoId: input.pedidoExternoId },
    criadoEm: agora,
    atualizadoEm: agora,
  };

  try {
    const resultado = await colecao.insertOne(pedido as Pedido);
    return { pedido: { ...pedido, _id: resultado.insertedId }, criado: true };
  } catch (erro) {
    if (erro instanceof MongoServerError && erro.code === 11000) {
      const duplicado = await colecao.findOne({
        "origemExterna.pedidoExternoId": input.pedidoExternoId,
      });
      if (duplicado) {
        return { pedido: duplicado, criado: false };
      }
    }
    throw erro;
  }
}
