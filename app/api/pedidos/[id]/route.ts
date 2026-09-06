import { NextResponse } from "next/server";
import { STATUS_PEDIDO, type StatusPedido } from "@/lib/models/pedido";
import { buscarPedidoPorId, buscarProdutosPorIds } from "@/lib/pedidos/repository";
import { atualizarStatusPedido } from "@/lib/pedidos/atualizarStatus";
import { paraPedidoDetalhado } from "@/lib/pedidos/apresentacao";

type Params = { params: Promise<{ id: string }> };

/** Detalhe de um pedido para o painel administrativo (Tarefa 8/EDI-81). */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const pedido = await buscarPedidoPorId(id);

  if (!pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  }

  const produtos = await buscarProdutosPorIds(
    pedido.itens.map((item) => item.produtoId.toString())
  );

  return NextResponse.json({ pedido: paraPedidoDetalhado(pedido, produtos) });
}

/** Atualização manual de status a partir do painel administrativo (Tarefa 8/EDI-81). */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { status } = (await request.json()) as { status?: string };

  if (!STATUS_PEDIDO.includes(status as StatusPedido)) {
    return NextResponse.json({ erro: "Status inválido." }, { status: 400 });
  }

  const pedido = await atualizarStatusPedido(id, status as StatusPedido);

  if (!pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    pedido: { id: pedido._id!.toString(), status: pedido.status, atualizadoEm: pedido.atualizadoEm },
  });
}
