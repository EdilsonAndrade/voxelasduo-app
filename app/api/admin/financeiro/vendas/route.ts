import { NextResponse } from "next/server";
import { criarLancamento, listarLancamentos } from "@/lib/financeiro/repository";
import { validarLancamento } from "@/lib/financeiro/validacao";

/** Vendas lançadas à mão — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  return NextResponse.json({ lancamentos: await listarLancamentos() });
}

export async function POST(request: Request) {
  const { erros, dados } = validarLancamento(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  return NextResponse.json({ lancamento: await criarLancamento(dados) }, { status: 201 });
}
