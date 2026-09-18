import { NextResponse } from "next/server";
import { buscarEnvioMercadoLivre } from "@/lib/estoque/canais/mercadoLivre/envios";
import { buscarPedidoPorOrigemExterna } from "@/lib/pedidos/repository";
import { atualizarRastreioPedido, atualizarStatusPedido } from "@/lib/pedidos/atualizarStatus";

interface NotificacaoMercadoLivre {
  resource?: string;
  application_id?: number | string;
}

/**
 * Recebe o tópico `shipments` do Mercado Livre (EDI-101). O corpo da
 * notificação é só o gatilho — status e código de rastreio vêm sempre de
 * `GET /shipments/{id}` (+ `/items` para o pedido vinculado, research.md #1),
 * mesmo princípio do webhook de pedidos (`orders_v2`).
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as NotificacaoMercadoLivre;

  if (String(payload.application_id ?? "") !== (process.env.MERCADOLIVRE_CLIENT_ID ?? "")) {
    return NextResponse.json({ recebido: true });
  }

  const shipmentId = payload.resource?.split("/").pop();
  if (!shipmentId) {
    return NextResponse.json({ recebido: true });
  }

  let envio;
  try {
    envio = await buscarEnvioMercadoLivre(shipmentId);
  } catch {
    // Falha transitória ao consultar o envio — o ML reenvia a notificação depois.
    return NextResponse.json({ erro: "Falha ao consultar o envio." }, { status: 500 });
  }

  const pedido = envio.orderId ? await buscarPedidoPorOrigemExterna(envio.orderId) : null;
  if (!pedido?._id) {
    // Sem pedido correspondente ainda registrado no site — nada a fazer (FR-009).
    return NextResponse.json({ recebido: true });
  }

  const pedidoId = pedido._id.toString();

  if (envio.trackingNumber) {
    await atualizarRastreioPedido(pedidoId, {
      codigo: envio.trackingNumber,
      transportadora: "Mercado Envios",
    });
  }

  if (envio.despachado) {
    await atualizarStatusPedido(pedidoId, "enviado");
  } else if (envio.entregue) {
    await atualizarStatusPedido(pedidoId, "entregue");
  }

  return NextResponse.json({ recebido: true });
}
