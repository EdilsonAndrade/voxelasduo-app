import { NextResponse } from "next/server";
import { atualizarLancamento, excluirLancamento } from "@/lib/financeiro/repository";
import { validarLancamento } from "@/lib/financeiro/validacao";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { erros, dados } = validarLancamento(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  const lancamento = await atualizarLancamento(id, dados);
  if (!lancamento) return NextResponse.json({ erro: "Venda não encontrada." }, { status: 404 });
  return NextResponse.json({ lancamento });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await excluirLancamento(id))) return NextResponse.json({ erro: "Venda não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
