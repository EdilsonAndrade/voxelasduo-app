import { NextResponse } from "next/server";
import { verificarPagamentoPedido } from "@/lib/pagamentos/verificacao";

/**
 * Confere no Mercado Pago o Pix pendente do pedido e atualiza o pedido — rede
 * de segurança para quando o webhook não chega, chamada pela tela de
 * pagamento do cliente a cada 5s. Mesma verificação do admin e do cron
 * (EDI-132); idempotente — só promove a "pago" uma vez.
 */
export async function POST(request: Request) {
  const { pedidoId } = (await request.json().catch(() => ({}))) as { pedidoId?: string };
  if (!pedidoId) {
    return NextResponse.json({ erro: "pedidoId é obrigatório." }, { status: 400 });
  }

  try {
    const { resultado, mensagem } = await verificarPagamentoPedido(pedidoId, "cliente");
    switch (resultado) {
      case "pedido_inexistente":
        return NextResponse.json({ erro: mensagem }, { status: 404 });
      case "falha":
        return NextResponse.json({ erro: "Falha ao consultar o pagamento." }, { status: 502 });
      case "pago":
        return NextResponse.json({ pago: true, status: "aprovado" });
      case "sem_tentativa":
        return NextResponse.json({ pago: false });
      default:
        return NextResponse.json({ pago: false, status: resultado });
    }
  } catch (erro) {
    console.error("Falha ao verificar pagamento no Mercado Pago:", erro);
    return NextResponse.json({ erro: "Falha ao consultar o pagamento." }, { status: 502 });
  }
}
