import { NextResponse } from "next/server";
import { buscarPagamento } from "@/lib/pagamentos/mercadopago";
import { atualizarStatusTentativa, buscarPedidoPorId } from "@/lib/pagamentos/repository";
import { mapearStatusMercadoPago } from "@/lib/pagamentos/status";

/**
 * Confere no Mercado Pago o Pix pendente do pedido e atualiza o pedido — rede
 * de segurança para quando o webhook não chega. Idempotente: só promove a
 * "pago" uma vez (mesma lógica do webhook). Só consulta tentativas nossas.
 */
export async function POST(request: Request) {
  const { pedidoId } = (await request.json().catch(() => ({}))) as { pedidoId?: string };
  if (!pedidoId) {
    return NextResponse.json({ erro: "pedidoId é obrigatório." }, { status: 400 });
  }

  const pedido = await buscarPedidoPorId(pedidoId);
  if (!pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  }
  if (pedido.status === "pago") {
    return NextResponse.json({ pago: true });
  }

  const pendente = [...pedido.pagamento.tentativas].reverse().find((t) => t.status === "pendente");
  if (!pendente) {
    return NextResponse.json({ pago: false });
  }

  try {
    const pagamento = await buscarPagamento(pendente.referenciaExterna);
    const status = mapearStatusMercadoPago(pagamento.status ?? "pending");
    if (status !== "pendente") {
      await atualizarStatusTentativa(
        pedidoId,
        pendente.referenciaExterna,
        status,
        pagamento.payment_method_id ?? pendente.metodo
      );
    }
    return NextResponse.json({ pago: status === "aprovado", status });
  } catch (erro) {
    console.error("Falha ao verificar pagamento no Mercado Pago:", erro);
    return NextResponse.json({ erro: "Falha ao consultar o pagamento." }, { status: 502 });
  }
}
