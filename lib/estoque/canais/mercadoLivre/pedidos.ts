import { obterAccessTokenValido } from "./auth";

export interface ItemPedidoMercadoLivre {
  itemId: string;
  quantidade: number;
}

export interface PedidoMercadoLivre {
  itens: ItemPedidoMercadoLivre[];
}

interface OrderMercadoLivreResponse {
  order_items: { item: { id: string }; quantity: number }[];
}

/**
 * Busca os dados reais de um pedido do Mercado Livre (`GET /orders/{orderId}`).
 * O webhook (tópico `orders_v2`) só entrega o gatilho — os itens/quantidades
 * vendidos vêm sempre desta consulta autenticada, nunca do corpo da
 * notificação (research.md #7).
 */
export async function buscarPedidoMercadoLivre(orderId: string): Promise<PedidoMercadoLivre> {
  const token = await obterAccessTokenValido();

  const resposta = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao consultar pedido no Mercado Livre (HTTP ${resposta.status}).`);
  }

  const dados = (await resposta.json()) as OrderMercadoLivreResponse;
  return {
    itens: dados.order_items.map((item) => ({
      itemId: item.item.id,
      quantidade: item.quantity,
    })),
  };
}
