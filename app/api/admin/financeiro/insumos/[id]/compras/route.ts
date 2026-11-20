import { NextResponse } from "next/server";
import { registrarCompra } from "@/lib/financeiro/insumosRepository";
import { validarCompraInsumo } from "@/lib/financeiro/validacao";

/** Nova compra do mesmo insumo: sobrescreve o custo atual e lança a despesa. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { erros, dados } = validarCompraInsumo(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  const insumo = await registrarCompra(id, dados);
  if (!insumo) return NextResponse.json({ erro: "Insumo não encontrado." }, { status: 404 });
  return NextResponse.json({ insumo }, { status: 201 });
}
