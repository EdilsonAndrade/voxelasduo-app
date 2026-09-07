import { NextResponse } from "next/server";
import { STATUS_PEDIDO, type RastreioPedido, type StatusPedido } from "@/lib/models/pedido";
import { buscarPedidoPorId, buscarProdutosPorIds } from "@/lib/pedidos/repository";
import { atualizarRastreioPedido, atualizarStatusPedido } from "@/lib/pedidos/atualizarStatus";
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

/**
 * Atualização manual de status e/ou rastreio a partir do painel administrativo
 * (Tarefa 8/EDI-81; rastreio adicionado na Tarefa 10/EDI-84 — exibido ao
 * cliente em "Meus Pedidos"). Os dois campos são independentes: envie um,
 * outro, ou os dois no mesmo corpo.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { status, rastreio } = (await request.json()) as {
    status?: string;
    rastreio?: Partial<RastreioPedido>;
  };

  if (status !== undefined && !STATUS_PEDIDO.includes(status as StatusPedido)) {
    return NextResponse.json({ erro: "Status inválido." }, { status: 400 });
  }

  if (rastreio !== undefined && (!rastreio.codigo?.trim() || !rastreio.transportadora?.trim())) {
    return NextResponse.json({ erro: "Informe código de rastreio e transportadora." }, { status: 400 });
  }

  if (status === undefined && rastreio === undefined) {
    return NextResponse.json({ erro: "Nada para atualizar." }, { status: 400 });
  }

  let pedido = status !== undefined ? await atualizarStatusPedido(id, status as StatusPedido) : null;
  if (rastreio !== undefined) {
    pedido = await atualizarRastreioPedido(id, {
      codigo: rastreio.codigo!.trim(),
      transportadora: rastreio.transportadora!.trim(),
    });
  } else if (status !== undefined && !pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  }

  if (!pedido) {
    pedido = await buscarPedidoPorId(id);
  }

  if (!pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    pedido: {
      id: pedido._id!.toString(),
      status: pedido.status,
      rastreio: pedido.rastreio,
      atualizadoEm: pedido.atualizadoEm,
    },
  });
}
