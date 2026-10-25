/**
 * Mercado Pago e Mercado Livre são a mesma aplicação e compartilham UMA URL
 * de notificação (EDI-132). Esta função pura descobre de quem é o aviso e
 * qual tratamento ele precisa, a partir da query string e do corpo
 * (research.md #1 da spec 036).
 *
 * - ML: corpo `{ resource, topic, application_id, user_id, ... }`.
 * - MP Webhook: `?data.id=..&type=payment` + corpo `{ type, data: { id } }` + `x-signature`.
 * - MP IPN (legado): `?id=..&topic=payment`, sem assinatura.
 */
export type TopicoMercadoLivre = "pedidos" | "perguntas" | "reclamacoes" | "mensagens" | "envios";

export interface NotificacaoMercadoLivre {
  resource?: string;
  topic?: string;
  application_id?: number | string;
}

export type NotificacaoIdentificada =
  | { origem: "mercado_pago"; tipo: string; id: string | null }
  | {
      origem: "mercado_livre";
      topico: TopicoMercadoLivre | null;
      topicoOriginal: string | null;
      payload: NotificacaoMercadoLivre;
    }
  | { origem: "desconhecida" };

const TOPICOS_MERCADO_LIVRE: Record<string, TopicoMercadoLivre> = {
  orders_v2: "pedidos",
  orders: "pedidos",
  questions: "perguntas",
  claims: "reclamacoes",
  claims_actions: "reclamacoes",
  messages: "mensagens",
  shipments: "envios",
};

function texto(valor: unknown): string | null {
  if (typeof valor === "string" && valor.trim()) return valor.trim();
  if (typeof valor === "number") return String(valor);
  return null;
}

export function identificarNotificacao({
  query,
  corpo,
  topicoPadrao,
}: {
  query: URLSearchParams;
  corpo: unknown;
  /** Tópico do ML assumido quando o aviso chega sem `topic` numa rota dedicada antiga. */
  topicoPadrao?: TopicoMercadoLivre;
}): NotificacaoIdentificada {
  const dados = (corpo && typeof corpo === "object" ? corpo : {}) as Record<string, unknown>;

  if (texto(dados.resource)) {
    const topicoOriginal = texto(dados.topic);
    const topico = topicoOriginal ? TOPICOS_MERCADO_LIVRE[topicoOriginal] ?? null : topicoPadrao ?? null;
    return {
      origem: "mercado_livre",
      topico,
      topicoOriginal,
      payload: dados as NotificacaoMercadoLivre,
    };
  }

  const dadosData = (dados.data && typeof dados.data === "object" ? dados.data : {}) as Record<string, unknown>;
  const tipo =
    texto(query.get("type")) ?? texto(query.get("topic")) ?? texto(dados.type) ?? texto(dados.topic);
  const id = texto(query.get("data.id")) ?? texto(dadosData.id) ?? texto(query.get("id"));

  if (!tipo && !id) {
    return { origem: "desconhecida" };
  }

  return { origem: "mercado_pago", tipo: tipo ?? "payment", id };
}
