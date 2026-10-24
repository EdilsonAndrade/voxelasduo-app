import { NextResponse } from "next/server";
import { validarItens } from "@/lib/producao/planosImpressao";
import { excluirPlano, substituirItens } from "@/lib/producao/planosImpressaoRepository";

type Contexto = { params: Promise<{ produtoId: string }> };

/** Substitui a lista inteira — edição de nome, tempo, início e remoção de linhas. */
export async function PUT(request: Request, { params }: Contexto) {
  const { produtoId } = await params;
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const { itens, erro } = validarItens(corpo?.itens);
  if (!itens) return NextResponse.json({ erro }, { status: 400 });

  const plano = await substituirItens(produtoId, itens);
  if (!plano) return NextResponse.json({ erro: "Produto não está no Tempo de Impressão." }, { status: 404 });
  return NextResponse.json({ plano });
}

/** Tira o produto do menu — o produto do catálogo não muda. */
export async function DELETE(_request: Request, { params }: Contexto) {
  const { produtoId } = await params;
  const excluido = await excluirPlano(produtoId);
  if (!excluido) return NextResponse.json({ erro: "Produto não está no Tempo de Impressão." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
