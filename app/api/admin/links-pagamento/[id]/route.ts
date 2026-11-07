import { NextResponse } from "next/server";
import { cancelarLinkPagamento } from "@/lib/linksPagamento/repository";

/** Cancela um link que ainda não gerou pedido — `{ acao: "cancelar" }`. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const corpo = (await request.json().catch(() => null)) as { acao?: unknown } | null;
  if (corpo?.acao !== "cancelar") {
    return NextResponse.json({ erro: "Ação inválida. Use { acao: \"cancelar\" }." }, { status: 400 });
  }
  const link = await cancelarLinkPagamento(id);
  if (!link) {
    return NextResponse.json(
      { erro: "Link não encontrado, já cancelado ou já usado em um pedido." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
