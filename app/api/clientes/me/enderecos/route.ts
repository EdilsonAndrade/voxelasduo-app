import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/clienteConfig";
import { buscarClientePorId } from "@/lib/clientes/repository";
import { buscarPedidosDoCliente, derivarHistoricoEnderecos } from "@/lib/clientes/pedidosAssociados";

/** Histórico de endereços (Tarefa 10/EDI-84, US5). Protegida por `proxy.ts`. */
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

  return NextResponse.json({ enderecos: derivarHistoricoEnderecos(cliente, pedidos) });
}
