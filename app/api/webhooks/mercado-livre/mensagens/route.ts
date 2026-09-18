import { NextResponse } from "next/server";
import { buscarMensagemMercadoLivre } from "@/lib/estoque/canais/mercadoLivre/mensagens";
import { upsertMensagemPendente } from "@/lib/atendimento/repository";

interface NotificacaoMercadoLivre {
  resource?: string;
  application_id?: number | string;
}

/**
 * Recebe o tópico `messages` do Mercado Livre (EDI-98, mensagens pós-venda).
 * O corpo da notificação é só o gatilho — o texto vem sempre de
 * `GET /messages/packs/{pack_id}/sellers/{seller_id}` (research.md #3),
 * mesmo princípio do webhook de pedidos (`orders_v2`). `resource` traz o
 * `pack_id` da conversa.
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as NotificacaoMercadoLivre;

  if (String(payload.application_id ?? "") !== (process.env.MERCADOLIVRE_CLIENT_ID ?? "")) {
    return NextResponse.json({ recebido: true });
  }

  const packId = payload.resource?.split("/").pop();
  if (!packId) {
    return NextResponse.json({ recebido: true });
  }

  let mensagem;
  try {
    mensagem = await buscarMensagemMercadoLivre(packId);
  } catch {
    // Falha transitória ao consultar a mensagem — o ML reenvia a notificação depois.
    return NextResponse.json({ erro: "Falha ao consultar a mensagem." }, { status: 500 });
  }

  await upsertMensagemPendente({
    mensagemId: mensagem.mensagemId,
    pedidoExternoId: mensagem.pedidoExternoId,
    texto: mensagem.texto,
    status: mensagem.pendente ? "pendente" : "respondida",
    linkOrigem: mensagem.pedidoExternoId
      ? `https://www.mercadolivre.com.br/vendas/${mensagem.pedidoExternoId}/detalhe`
      : "https://www.mercadolivre.com.br/vendas",
  });

  return NextResponse.json({ recebido: true });
}
