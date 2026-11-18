import { NextResponse } from "next/server";
import { atualizarDespesa, excluirDespesa } from "@/lib/financeiro/repository";
import { validarDespesa } from "@/lib/financeiro/validacao";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { erros, dados } = validarDespesa(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  const despesa = await atualizarDespesa(id, dados);
  if (!despesa) return NextResponse.json({ erro: "Despesa não encontrada." }, { status: 404 });
  return NextResponse.json({ despesa });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await excluirDespesa(id))) return NextResponse.json({ erro: "Despesa não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
