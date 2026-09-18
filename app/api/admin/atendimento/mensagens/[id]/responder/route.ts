import { NextResponse } from "next/server";
import { responderMensagemMercadoLivre } from "@/lib/estoque/canais/mercadoLivre/mensagens";
import { buscarMensagemPorId, marcarMensagemRespondida } from "@/lib/atendimento/repository";

type Params = { params: Promise<{ id: string }> };

/** Responde uma mensagem pós-venda direto pelo admin (US3, FR-012), mesmo contrato de FR-015. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { texto } = (await request.json().catch(() => ({}))) as { texto?: string };

  if (!texto?.trim()) {
    return NextResponse.json({ erro: "Informe o texto da resposta." }, { status: 400 });
  }

  const mensagem = await buscarMensagemPorId(id);
  if (!mensagem?.pedidoExternoId) {
    return NextResponse.json({ erro: "Mensagem não encontrada." }, { status: 404 });
  }

  try {
    await responderMensagemMercadoLivre(mensagem.pedidoExternoId, texto.trim());
  } catch {
    return NextResponse.json(
      { erro: "Falha ao responder a mensagem no Mercado Livre. Tente novamente." },
      { status: 502 }
    );
  }

  await marcarMensagemRespondida(mensagem.mensagemId);

  return NextResponse.json({ ok: true, resolvido: true });
}
