import { NextResponse } from "next/server";
import { listarPedidosEvento, serializarPedidoEvento } from "@/lib/eventos/repository";

/** Lista os pedidos de evento (todos da equipe veem todos), com busca por nome/WhatsApp e filtro por evento. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pedidos = await listarPedidosEvento({
    busca: searchParams.get("busca") ?? undefined,
    eventoId: searchParams.get("evento") ?? undefined,
  });
  return NextResponse.json({ pedidos: pedidos.map(serializarPedidoEvento) });
}
