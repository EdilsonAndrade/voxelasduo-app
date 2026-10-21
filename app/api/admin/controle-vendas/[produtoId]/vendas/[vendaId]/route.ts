import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { atualizarVenda, removerVenda } from "@/lib/controleVendas/repository";
import { validarVenda } from "@/lib/controleVendas/validacao";
import type { VendaControlePayload } from "@/lib/models/controleVendas";

type Params = { params: Promise<{ produtoId: string; vendaId: string }> };

/** Edita uma venda manual — o estoque baixado pela versão anterior é devolvido e baixado de novo. */
export async function PATCH(request: Request, { params }: Params) {
  const { produtoId, vendaId } = await params;
  if (!ObjectId.isValid(produtoId)) {
    return NextResponse.json({ erro: "Produto inválido." }, { status: 400 });
  }

  const corpo = await request.json().catch(() => null);
  const erros = validarVenda(corpo);
  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Confira os campos da venda.", campos: erros }, { status: 400 });
  }

  const item = await atualizarVenda(produtoId, vendaId, corpo as VendaControlePayload);
  if (!item) return NextResponse.json({ erro: "Venda não encontrada." }, { status: 404 });
  return NextResponse.json({ item });
}

/** Remove a venda e devolve ao estoque do site o que ela tinha baixado. */
export async function DELETE(_request: Request, { params }: Params) {
  const { produtoId, vendaId } = await params;
  if (!ObjectId.isValid(produtoId)) {
    return NextResponse.json({ erro: "Produto inválido." }, { status: 400 });
  }

  const item = await removerVenda(produtoId, vendaId);
  if (!item) return NextResponse.json({ erro: "Venda não encontrada." }, { status: 404 });
  return NextResponse.json({ item });
}
