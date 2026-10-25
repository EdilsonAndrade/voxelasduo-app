import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { MPNotFoundError } from "mercadopago";
import { buscarPagamento } from "@/lib/pagamentos/mercadopago";
import { atualizarStatusTentativa, registrarFalhaPagamento } from "@/lib/pagamentos/repository";
import { mapearStatusMercadoPago } from "@/lib/pagamentos/status";
import { falha } from "@/lib/pagamentos/falhas";

/**
 * Processa um aviso de pagamento do Mercado Pago (tópico "payment"). O aviso
 * em si nunca é usado como fonte de dados além do id — os detalhes reais vêm
 * sempre de uma consulta à API (research.md #6 da spec 004).
 *
 * Pagamento inexistente (simulação do painel, id de outra conta) responde 200
 * para o MP não reenviar à toa; falha transitória responde 500 para ele
 * reenviar depois (research.md #3 da spec 036).
 */
export async function processarPagamentoMercadoPago(pagamentoId: string): Promise<Response> {
  let pagamento;
  try {
    pagamento = await buscarPagamento(pagamentoId);
  } catch (erro) {
    if (erro instanceof MPNotFoundError) {
      console.warn(`[notificacoes] pagamento ${pagamentoId} não encontrado no Mercado Pago — ignorado.`);
      return NextResponse.json({ recebido: true, ignorado: "pagamento_nao_encontrado" });
    }
    console.error(`[notificacoes] falha ao consultar o pagamento ${pagamentoId} no Mercado Pago:`, erro);
    return NextResponse.json({ erro: "Falha ao processar a notificação." }, { status: 500 });
  }

  const pedidoId = pagamento.external_reference;
  if (!pedidoId || !ObjectId.isValid(pedidoId)) {
    // Pagamento sem referência a um pedido nosso — nada a fazer.
    return NextResponse.json({ recebido: true });
  }

  const status = mapearStatusMercadoPago(pagamento.status ?? "pending");
  try {
    const promocao = await atualizarStatusTentativa(
      pedidoId,
      String(pagamento.id),
      status,
      pagamento.payment_method_id ?? "desconhecido"
    );

    if (promocao === "cancelado") {
      await registrarFalhaPagamento(pedidoId, { ...falha("aprovado_pedido_cancelado"), origem: "notificacao", em: new Date() });
    } else if (status === "recusado" || status === "expirado") {
      await registrarFalhaPagamento(pedidoId, { ...falha(status), origem: "notificacao", em: new Date() });
    }
  } catch (erro) {
    console.error(`[notificacoes] falha ao atualizar o pedido ${pedidoId} (pagamento ${pagamentoId}):`, erro);
    return NextResponse.json({ erro: "Falha ao processar a notificação." }, { status: 500 });
  }

  return NextResponse.json({ recebido: true });
}
