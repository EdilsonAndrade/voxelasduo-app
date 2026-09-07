import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/clienteConfig";
import { buscarClientePorId } from "@/lib/clientes/repository";
import { buscarPedidosDoCliente } from "@/lib/clientes/pedidosAssociados";
import { paraPedidoDetalhado } from "@/lib/pedidos/apresentacao";
import { buscarProdutosPorIds } from "@/lib/pedidos/repository";

/** "Meus Pedidos" (Tarefa 10/EDI-84, US3) — protegida por `proxy.ts`; checagem aqui é defesa em profundidade. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const cliente = await buscarClientePorId(session.user.id);
  if (!cliente) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const pedidos = await buscarPedidosDoCliente(cliente);
  const produtos = await buscarProdutosPorIds(
    pedidos.flatMap((pedido) => pedido.itens.map((item) => item.produtoId.toString()))
  );

  return NextResponse.json({
    pedidos: pedidos.map((pedido) => paraPedidoDetalhado(pedido, produtos)),
  });
}
