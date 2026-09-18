import { NextResponse } from "next/server";
import { buscarReclamacaoMercadoLivre } from "@/lib/estoque/canais/mercadoLivre/reclamacoes";
import { upsertReclamacaoPendente } from "@/lib/atendimento/repository";

interface NotificacaoMercadoLivre {
  resource?: string;
  application_id?: number | string;
}

/**
 * Recebe os tópicos `claims`/`claims_actions` do Mercado Livre (EDI-98). O
 * corpo da notificação é só o gatilho — motivo e status vêm sempre de
 * `GET /post-purchase/v1/claims/{id}` (research.md #2), mesmo princípio do
 * webhook de pedidos (`orders_v2`).
 *
 * NOTA: o link exato para a reclamação no portal do Mercado Livre
 * (`https://www.mercadolivre.com.br/vendas/{id}/detalhe`) precisa ser
 * validado contra uma reclamação real antes de considerar esta rota pronta
 * para produção (research.md #2, T038 do tasks.md).
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as NotificacaoMercadoLivre;

  if (String(payload.application_id ?? "") !== (process.env.MERCADOLIVRE_CLIENT_ID ?? "")) {
    return NextResponse.json({ recebido: true });
  }

  const reclamacaoId = payload.resource?.split("/").pop();
  if (!reclamacaoId) {
    return NextResponse.json({ recebido: true });
  }

  let reclamacao;
  try {
    reclamacao = await buscarReclamacaoMercadoLivre(reclamacaoId);
  } catch {
    // Falha transitória ao consultar a reclamação — o ML reenvia a notificação depois.
    return NextResponse.json({ erro: "Falha ao consultar a reclamação." }, { status: 500 });
  }

  await upsertReclamacaoPendente({
    reclamacaoId: reclamacao.reclamacaoId,
    pedidoExternoId: reclamacao.pedidoExternoId,
    motivo: reclamacao.motivo,
    status: reclamacao.aberta ? "aberta" : "fechada",
    linkOrigem: reclamacao.pedidoExternoId
      ? `https://www.mercadolivre.com.br/vendas/${reclamacao.pedidoExternoId}/detalhe`
      : "https://www.mercadolivre.com.br/vendas",
  });

  return NextResponse.json({ recebido: true });
}
