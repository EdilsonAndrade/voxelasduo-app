import { NextResponse } from "next/server";
import { atualizarImpressora, excluirImpressora } from "@/lib/financeiro/repository";
import { validarImpressora } from "@/lib/financeiro/validacao";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { erros, dados } = validarImpressora(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  const impressora = await atualizarImpressora(id, dados);
  if (!impressora) return NextResponse.json({ erro: "Impressora não encontrada." }, { status: 404 });
  return NextResponse.json({ impressora });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await excluirImpressora(id))) return NextResponse.json({ erro: "Impressora não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
