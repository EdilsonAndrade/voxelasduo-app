import type { CodigoFalhaPagamento, FalhaPagamento } from "@/lib/models/pedido";

type FalhaSemOrigem = Pick<FalhaPagamento, "codigo" | "mensagem">;

/** Textos exibidos no admin para cada motivo de pagamento não aprovado (EDI-132). */
export const MENSAGENS_FALHA_PAGAMENTO: Record<CodigoFalhaPagamento, string> = {
  pendente: "Pagamento ainda pendente no Mercado Pago.",
  recusado: "Pagamento recusado no Mercado Pago.",
  expirado: "Pagamento expirado ou cancelado no Mercado Pago.",
  sem_tentativa: "Pedido sem pagamento iniciado.",
  nao_encontrado: "Pagamento não encontrado no Mercado Pago.",
  falha_consulta: "Falha ao consultar o Mercado Pago.",
  aprovado_pedido_cancelado: "Pagamento aprovado no Mercado Pago, mas o pedido está cancelado — avalie estorno ou reativação.",
};

export function falha(codigo: CodigoFalhaPagamento): FalhaSemOrigem {
  return { codigo, mensagem: MENSAGENS_FALHA_PAGAMENTO[codigo] };
}
