import { ObjectId } from "mongodb";
import type { RecebimentoPagamento } from "@/lib/models/pedido";
import { colecaoPedidos } from "@/lib/pedidos/repository";
import { buscarPagamento, type PagamentoResposta } from "./mercadopago";

const centavos = (reais: number | undefined) => Math.round((reais ?? 0) * 100);

/** Lê do pagamento do MP o que a loja pagou de tarifa e o que recebeu. */
export function extrairRecebimento(
  pagamento: Pick<PagamentoResposta, "transaction_amount" | "fee_details" | "coupon_amount" | "transaction_details" | "installments">,
  agora = new Date()
): RecebimentoPagamento {
  let taxa = 0;
  let juros = 0;
  for (const tarifa of pagamento.fee_details ?? []) {
    if (tarifa.fee_payer === "payer") juros += centavos(tarifa.amount);
    else taxa += centavos(tarifa.amount);
  }
  const valor = centavos(pagamento.transaction_amount);
  const liquidoInformado = pagamento.transaction_details?.net_received_amount;
  return {
    valorCentavos: valor,
    taxaCentavos: taxa,
    jurosClienteCentavos: juros,
    cupomCentavos: centavos(pagamento.coupon_amount),
    liquidoCentavos: liquidoInformado != null ? centavos(liquidoInformado) : valor - taxa,
    parcelas: pagamento.installments ?? 1,
    consultadoEm: agora,
  };
}

/** Grava os valores reais do pagamento aprovado no pedido. Nunca derruba quem chamou. */
export async function registrarRecebimento(pedidoId: string, pagamento: PagamentoResposta): Promise<RecebimentoPagamento | null> {
  try {
    const recebimento = extrairRecebimento(pagamento);
    const colecao = await colecaoPedidos();
    await colecao.updateOne({ _id: new ObjectId(pedidoId) }, { $set: { "pagamento.recebimento": recebimento } });
    return recebimento;
  } catch (erro) {
    console.error(`[pagamentos] falha ao gravar a tarifa do pagamento ${pagamento.id} no pedido ${pedidoId}:`, erro);
    return null;
  }
}

/** Busca no MP e grava — para pedidos pagos antes de a tarifa ser guardada. */
export async function buscarERegistrarRecebimento(pedidoId: string, pagamentoId: string): Promise<RecebimentoPagamento | null> {
  try {
    const pagamento = await buscarPagamento(pagamentoId);
    if (pagamento.status !== "approved") return null;
    return registrarRecebimento(pedidoId, pagamento);
  } catch (erro) {
    console.error(`[pagamentos] falha ao consultar a tarifa do pagamento ${pagamentoId} (pedido ${pedidoId}):`, erro);
    return null;
  }
}
