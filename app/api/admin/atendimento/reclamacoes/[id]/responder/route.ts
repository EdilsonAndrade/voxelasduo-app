import { NextResponse } from "next/server";
import { responderReclamacaoMercadoLivre } from "@/lib/estoque/canais/mercadoLivre/reclamacoes";
import { buscarReclamacaoPorId } from "@/lib/atendimento/repository";

type Params = { params: Promise<{ id: string }> };

/**
 * Responde/comenta uma reclamação direto pelo admin (US2, FR-011). Não marca
 * a reclamação como `fechada` — o fechamento é sempre refletido pela próxima
 * notificação do Mercado Livre (FR-014), nunca assumido localmente após uma
 * resposta (comentar não necessariamente encerra a reclamação).
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { texto } = (await request.json().catch(() => ({}))) as { texto?: string };

  if (!texto?.trim()) {
    return NextResponse.json({ erro: "Informe o texto da resposta." }, { status: 400 });
  }

  const reclamacao = await buscarReclamacaoPorId(id);
  if (!reclamacao) {
    return NextResponse.json({ erro: "Reclamação não encontrada." }, { status: 404 });
  }

  try {
    await responderReclamacaoMercadoLivre(reclamacao.reclamacaoId, texto.trim());
  } catch {
    return NextResponse.json(
      { erro: "Falha ao responder a reclamação no Mercado Livre. Tente novamente." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, resolvido: false });
}
