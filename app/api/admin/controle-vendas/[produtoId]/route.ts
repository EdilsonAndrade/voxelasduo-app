import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { salvarProducao } from "@/lib/controleVendas/repository";
import { validarProducao } from "@/lib/controleVendas/validacao";
import type { ProducaoControlePayload } from "@/lib/models/controleVendas";

/** Quantidade produzida, custo e preço de referência do produto no controle de vendas. */
export async function PUT(request: Request, { params }: { params: Promise<{ produtoId: string }> }) {
  const { produtoId } = await params;
  if (!ObjectId.isValid(produtoId)) {
    return NextResponse.json({ erro: "Produto inválido." }, { status: 400 });
  }

  const corpo = await request.json().catch(() => null);
  const erros = validarProducao(corpo);
  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Confira os campos da produção.", campos: erros }, { status: 400 });
  }

  const item = await salvarProducao(produtoId, corpo as ProducaoControlePayload);
  if (!item) return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  return NextResponse.json({ item });
}
