import { NextResponse } from "next/server";
import { criarInsumo, listarInsumos } from "@/lib/financeiro/insumosRepository";
import { validarInsumo } from "@/lib/financeiro/validacao";

/** Catálogo de insumos — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  return NextResponse.json({ insumos: await listarInsumos() });
}

/** Cadastra o insumo e lança a compra nas despesas. */
export async function POST(request: Request) {
  const { erros, dados } = validarInsumo(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  return NextResponse.json({ insumo: await criarInsumo(dados) }, { status: 201 });
}
