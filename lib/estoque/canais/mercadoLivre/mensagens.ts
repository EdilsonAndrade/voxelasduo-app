import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";

export interface MensagemDetalheMercadoLivre {
  mensagemId: string;
  /** id do pedido no Mercado Livre — casado com `origemExterna.pedidoExternoId` de `Pedido`. */
  pedidoExternoId?: string;
  texto: string;
  pendente: boolean;
}

interface MessageMercadoLivreResponse {
  id: string;
  text: string;
  status: string;
}

interface MessagesPackResponse {
  messages: MessageMercadoLivreResponse[];
}

/** Reaproveitado por `promocoes.ts` (EDI-108) para resolver o `seller_id` do app. */
export async function obterVendedorId(token: string): Promise<string> {
  const resposta = await fetch("https://api.mercadolibre.com/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao identificar o vendedor no Mercado Livre");
  }

  const dados = (await resposta.json()) as { id: number };
  return String(dados.id);
}

/**
 * Busca o histórico de mensagens pós-venda de um pack
 * (`GET /messages/packs/{pack_id}/sellers/{seller_id}`, research.md #3) e
 * retorna a última mensagem — o webhook (tópico `messages`) só entrega o
 * gatilho, mesmo princípio já usado pelos demais tópicos.
 */
export async function buscarMensagemMercadoLivre(
  packId: string
): Promise<MensagemDetalheMercadoLivre> {
  const token = await obterAccessTokenValido();
  const vendedorId = await obterVendedorId(token);

  const resposta = await fetch(
    `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${vendedorId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao consultar mensagem no Mercado Livre");
  }

  const dados = (await resposta.json()) as MessagesPackResponse;
  const ultima = dados.messages[dados.messages.length - 1];

  return {
    mensagemId: ultima?.id ?? packId,
    pedidoExternoId: packId,
    texto: ultima?.text ?? "",
    pendente: ultima?.status !== "READ",
  };
}

/**
 * Publica uma resposta numa conversa pós-venda
 * (`POST /messages/packs/{pack_id}/sellers/{seller_id}`, research.md #3).
 */
export async function responderMensagemMercadoLivre(packId: string, texto: string): Promise<void> {
  const token = await obterAccessTokenValido();
  const vendedorId = await obterVendedorId(token);

  const resposta = await fetch(
    `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${vendedorId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: texto }),
    }
  );

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao responder mensagem no Mercado Livre");
  }
}
