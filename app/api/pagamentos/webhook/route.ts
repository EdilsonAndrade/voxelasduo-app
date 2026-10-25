import { despacharNotificacao } from "@/lib/notificacoes/despachante";

/**
 * Rota antiga do webhook de pagamentos do Mercado Pago. MP e ML compartilham
 * uma única URL de notificação (EDI-132): esta rota aceita qualquer tópico de
 * ambos pelo despachante. A lógica do pagamento fica em
 * `lib/notificacoes/pagamento.ts`.
 */
export async function POST(request: Request) {
  return despacharNotificacao(request);
}
