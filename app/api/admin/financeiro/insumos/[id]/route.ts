import { NextResponse } from "next/server";
import { atualizarInsumo, excluirInsumo } from "@/lib/financeiro/insumosRepository";
import { validarInsumo } from "@/lib/financeiro/validacao";

/** Edita o cadastro e corrige a despesa da última compra. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { erros, dados } = validarInsumo(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  const insumo = await atualizarInsumo(id, dados);
  if (!insumo) return NextResponse.json({ erro: "Insumo não encontrado." }, { status: 404 });
  return NextResponse.json({ insumo });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await excluirInsumo(id))) return NextResponse.json({ erro: "Insumo não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
