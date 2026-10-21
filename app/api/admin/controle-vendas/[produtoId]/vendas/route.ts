import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { adicionarVenda } from "@/lib/controleVendas/repository";
import { validarVenda } from "@/lib/controleVendas/validacao";
import type { VendaControlePayload } from "@/lib/models/controleVendas";

/** Lança uma venda manual do produto; baixa o estoque do site quando pedido. */
export async function POST(request: Request, { params }: { params: Promise<{ produtoId: string }> }) {
  const { produtoId } = await params;
  if (!ObjectId.isValid(produtoId)) {
    return NextResponse.json({ erro: "Produto inválido." }, { status: 400 });
  }

  const corpo = await request.json().catch(() => null);
  const erros = validarVenda(corpo);
  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Confira os campos da venda.", campos: erros }, { status: 400 });
  }

  const item = await adicionarVenda(produtoId, corpo as VendaControlePayload);
  if (!item) return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  return NextResponse.json({ item }, { status: 201 });
}
