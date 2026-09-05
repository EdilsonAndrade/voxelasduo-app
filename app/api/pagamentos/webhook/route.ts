import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { assinaturaWebhookValida } from "@/lib/pagamentos/webhook";
import { buscarPagamento } from "@/lib/pagamentos/mercadopago";
import { atualizarStatusTentativa } from "@/lib/pagamentos/repository";
import { mapearStatusMercadoPago } from "@/lib/pagamentos/status";

/**
 * Recebe notificações do Mercado Pago (tópico "payment"). O payload em si
 * nunca é usado como fonte de dados além do `data.id` — os detalhes reais
 * do pagamento vêm sempre de uma consulta subsequente à API (research.md #6).
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  const assinaturaOk = assinaturaWebhookValida({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET!,
  });

  if (!assinaturaOk) {
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
  }

  if (!dataId) {
    // Notificação sem id de pagamento identificável — nada a processar.
    return NextResponse.json({ recebido: true });
  }

  let pagamento;
  try {
    pagamento = await buscarPagamento(dataId);
  } catch {
    // Falha transitória ao consultar a API do Mercado Pago — MP reenvia depois.
    return NextResponse.json({ erro: "Falha ao consultar o pagamento." }, { status: 500 });
  }

  const pedidoId = pagamento.external_reference;
  if (!pedidoId || !ObjectId.isValid(pedidoId)) {
    // Pagamento sem referência a um pedido nosso — nada a fazer.
    return NextResponse.json({ recebido: true });
  }

  try {
    await atualizarStatusTentativa(
      pedidoId,
      String(pagamento.id),
      mapearStatusMercadoPago(pagamento.status ?? "pending"),
      pagamento.payment_method_id ?? "desconhecido"
    );
  } catch {
    return NextResponse.json({ erro: "Falha ao atualizar o pedido." }, { status: 500 });
  }

  return NextResponse.json({ recebido: true });
}
