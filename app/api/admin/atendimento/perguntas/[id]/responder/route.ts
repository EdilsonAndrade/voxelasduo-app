import { NextResponse } from "next/server";
import { responderPerguntaMercadoLivre } from "@/lib/estoque/canais/mercadoLivre/perguntas";
import { buscarPerguntaPorId, marcarPerguntaRespondida } from "@/lib/atendimento/repository";

type Params = { params: Promise<{ id: string }> };

/**
 * Responde uma pergunta direto pelo admin (US1, FR-010). Só marca como
 * `respondida` depois de confirmar sucesso na API do Mercado Livre — evita o
 * item "desaparecer" da listagem sem a resposta ter sido de fato publicada
 * (FR-015, contracts/atendimento-responder.md).
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { texto } = (await request.json().catch(() => ({}))) as { texto?: string };

  if (!texto?.trim()) {
    return NextResponse.json({ erro: "Informe o texto da resposta." }, { status: 400 });
  }

  const pergunta = await buscarPerguntaPorId(id);
  if (!pergunta) {
    return NextResponse.json({ erro: "Pergunta não encontrada." }, { status: 404 });
  }

  try {
    await responderPerguntaMercadoLivre(pergunta.perguntaId, texto.trim());
  } catch {
    return NextResponse.json(
      { erro: "Falha ao responder a pergunta no Mercado Livre. Tente novamente." },
      { status: 502 }
    );
  }

  await marcarPerguntaRespondida(pergunta.perguntaId);

  return NextResponse.json({ ok: true, resolvido: true });
}
