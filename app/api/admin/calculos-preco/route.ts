import { NextResponse } from "next/server";
import { criarCalculoPreco, listarCalculosPreco, validarCalculoPreco } from "@/lib/produtos/calculosPreco";

/** Cálculos de preço salvos pela calculadora — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  const calculos = await listarCalculosPreco();
  return NextResponse.json({ calculos });
}

export async function POST(request: Request) {
  const { dados, erro } = validarCalculoPreco(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro }, { status: 400 });

  const calculo = await criarCalculoPreco(dados);
  return NextResponse.json({ calculo }, { status: 201 });
}
