import { despacharNotificacao } from "@/lib/notificacoes/despachante";

/**
 * Endereço único de notificações da aplicação compartilhada Mercado Pago +
 * Mercado Livre (EDI-132) — pagamentos do site e vendas, perguntas,
 * reclamações, mensagens e envios do ML. Ver contracts/api.md da spec 036.
 */
export async function POST(request: Request) {
  return despacharNotificacao(request);
}
