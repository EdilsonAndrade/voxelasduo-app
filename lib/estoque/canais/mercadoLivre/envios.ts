import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";

export interface EnvioDetalheMercadoLivre {
  shipmentId: string;
  /** id do pedido no Mercado Livre — casado com `origemExterna.pedidoExternoId` de `Pedido`. */
  orderId?: string;
  trackingNumber?: string;
  /** `true` quando o status do envio indica que já foi despachado (research.md #2). */
  despachado: boolean;
  /** `true` quando o status do envio indica entrega confirmada (research.md #2). */
  entregue: boolean;
  /**
   * Data em que a etiqueta poderá ser impressa, quando o envio está represado
   * (`substatus: "buffered"` — EDI-105, research.md #1). `undefined` quando o
   * envio não está nesse estado.
   */
  aguardandoLiberacaoAte?: Date;
}

interface ShipmentMercadoLivreResponse {
  id: number;
  status: string;
  substatus?: string | null;
  tracking_number?: string | null;
  buffering?: { date?: string | null } | null;
}

interface ShipmentItemsMercadoLivreResponse {
  order_id?: number;
}

/**
 * Busca os dados reais de um envio do Mercado Livre (`GET /shipments/{id}`).
 * O `order_id` foi descontinuado nessa resposta a partir de 12/10/2025 — vem
 * sempre de `GET /shipments/{id}/items` (research.md #1). O webhook (tópico
 * `shipments`) só entrega o gatilho, mesmo princípio já usado pelos demais
 * webhooks.
 */
export async function buscarEnvioMercadoLivre(shipmentId: string): Promise<EnvioDetalheMercadoLivre> {
  const token = await obterAccessTokenValido();
  const headers = { Authorization: `Bearer ${token}` };

  const [respostaEnvio, respostaItens] = await Promise.all([
    fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, { headers }),
    fetch(`https://api.mercadolibre.com/shipments/${shipmentId}/items`, { headers }),
  ]);

  if (!respostaEnvio.ok) {
    throw await erroMercadoLivre(respostaEnvio, "Falha ao consultar envio no Mercado Livre");
  }
  if (!respostaItens.ok) {
    throw await erroMercadoLivre(respostaItens, "Falha ao consultar itens do envio no Mercado Livre");
  }

  const envio = (await respostaEnvio.json()) as ShipmentMercadoLivreResponse;
  const itens = (await respostaItens.json()) as ShipmentItemsMercadoLivreResponse[];

  const emBuffering = envio.substatus === "buffered";

  return {
    shipmentId: String(envio.id),
    orderId: itens[0]?.order_id !== undefined ? String(itens[0].order_id) : undefined,
    trackingNumber: envio.tracking_number ?? undefined,
    despachado: envio.status === "shipped",
    entregue: envio.status === "delivered",
    aguardandoLiberacaoAte:
      emBuffering && envio.buffering?.date ? new Date(envio.buffering.date) : undefined,
  };
}
