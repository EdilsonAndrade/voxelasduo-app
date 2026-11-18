import { NextResponse } from "next/server";
import { criarDespesa, listarDespesas } from "@/lib/financeiro/repository";
import { validarDespesa } from "@/lib/financeiro/validacao";

/** Despesas e compras de insumo — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  return NextResponse.json({ despesas: await listarDespesas() });
}

export async function POST(request: Request) {
  const { erros, dados } = validarDespesa(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  return NextResponse.json({ despesa: await criarDespesa(dados) }, { status: 201 });
}
