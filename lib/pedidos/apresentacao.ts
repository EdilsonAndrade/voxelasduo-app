import type { CanalOrigem, Pedido, StatusPedido } from "@/lib/models/pedido";
import type { Produto } from "@/lib/models/produto";

export interface PedidoResumo {
  id: string;
  canalOrigem: CanalOrigem;
  status: StatusPedido;
  cliente: { nome: string; email: string };
  valorTotal: number;
  criadoEm: Date;
  temItemSemCorrespondencia: boolean;
  rastreio?: Pedido["rastreio"];
}

export interface ItemPedidoDetalhe {
  produtoId: string | null;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  semCorrespondencia: boolean;
}

export interface PedidoDetalhado {
  id: string;
  canalOrigem: CanalOrigem;
  status: StatusPedido;
  cliente: Pedido["cliente"];
  itens: ItemPedidoDetalhe[];
  valorTotal: number;
  pagamento: Pedido["pagamento"];
  origemExterna?: Pedido["origemExterna"];
  criadoEm: Date;
  atualizadoEm: Date;
  rastreio?: Pedido["rastreio"];
}

function resolverItem(
  item: Pedido["itens"][number],
  produtos: Map<string, Produto>
): ItemPedidoDetalhe {
  const produto = produtos.get(item.produtoId.toString());
  return {
    produtoId: produto ? item.produtoId.toString() : null,
    nome: produto?.nome ?? "Produto removido do catálogo",
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
    semCorrespondencia: !produto,
  };
}

export function paraPedidoResumo(pedido: Pedido, produtos: Map<string, Produto>): PedidoResumo {
  const temItemSemCorrespondencia = pedido.itens.some(
    (item) => !produtos.has(item.produtoId.toString())
  );

  return {
    id: pedido._id!.toString(),
    canalOrigem: pedido.canalOrigem,
    status: pedido.status,
    cliente: { nome: pedido.cliente.nome, email: pedido.cliente.email },
    valorTotal: pedido.valorTotal,
    criadoEm: pedido.criadoEm,
    temItemSemCorrespondencia,
    rastreio: pedido.rastreio,
  };
}

export function paraPedidoDetalhado(
  pedido: Pedido,
  produtos: Map<string, Produto>
): PedidoDetalhado {
  return {
    id: pedido._id!.toString(),
    canalOrigem: pedido.canalOrigem,
    status: pedido.status,
    cliente: pedido.cliente,
    itens: pedido.itens.map((item) => resolverItem(item, produtos)),
    valorTotal: pedido.valorTotal,
    pagamento: pedido.pagamento,
    origemExterna: pedido.origemExterna,
    criadoEm: pedido.criadoEm,
    atualizadoEm: pedido.atualizadoEm,
    rastreio: pedido.rastreio,
  };
}
