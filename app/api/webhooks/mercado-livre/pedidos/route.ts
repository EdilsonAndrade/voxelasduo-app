import { despacharNotificacao } from "@/lib/notificacoes/despachante";

/**
 * Rota antiga do tópico "pedidos" do Mercado Livre. MP e ML compartilham uma única
 * URL de notificação (EDI-132): esta rota aceita qualquer tópico pelo
 * despachante, assumindo "pedidos" quando o aviso vier sem `topic`. A lógica do
 * tópico fica em `lib/notificacoes/mercadoLivre/pedidos.ts`.
 */
export async function POST(request: Request) {
  return despacharNotificacao(request, { topicoPadrao: "pedidos" });
}
