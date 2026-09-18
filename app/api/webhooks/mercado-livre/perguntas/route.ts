import { NextResponse } from "next/server";
import { buscarPerguntaMercadoLivre } from "@/lib/estoque/canais/mercadoLivre/perguntas";
import { buscarProdutoPorMercadoLivreId } from "@/lib/produtos/repository";
import { upsertPerguntaPendente } from "@/lib/atendimento/repository";

interface NotificacaoMercadoLivre {
  resource?: string;
  application_id?: number | string;
}

const LINK_PERGUNTAS_FALLBACK = "https://www.mercadolivre.com.br/perguntas/lista";

/**
 * Recebe o tópico `questions` do Mercado Livre (EDI-98). O corpo da
 * notificação é só o gatilho — o texto e o status vêm sempre de
 * `GET /questions/{id}` (research.md #1), mesmo princípio do webhook de
 * pedidos (`orders_v2`).
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as NotificacaoMercadoLivre;

  if (String(payload.application_id ?? "") !== (process.env.MERCADOLIVRE_CLIENT_ID ?? "")) {
    return NextResponse.json({ recebido: true });
  }

  const perguntaId = payload.resource?.split("/").pop();
  if (!perguntaId) {
    return NextResponse.json({ recebido: true });
  }

  let pergunta;
  try {
    pergunta = await buscarPerguntaMercadoLivre(perguntaId);
  } catch {
    // Falha transitória ao consultar a pergunta — o ML reenvia a notificação depois.
    return NextResponse.json({ erro: "Falha ao consultar a pergunta." }, { status: 500 });
  }

  const produto = await buscarProdutoPorMercadoLivreId(pergunta.itemId);

  await upsertPerguntaPendente({
    perguntaId: pergunta.perguntaId,
    itemId: pergunta.itemId,
    produtoId: produto?._id,
    texto: pergunta.texto,
    status: pergunta.respondida ? "respondida" : "pendente",
    linkOrigem: produto?.integracoes?.mercadoLivrePermalink ?? LINK_PERGUNTAS_FALLBACK,
  });

  return NextResponse.json({ recebido: true });
}
