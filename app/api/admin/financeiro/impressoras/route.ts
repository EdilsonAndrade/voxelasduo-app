import { NextResponse } from "next/server";
import { criarImpressora, listarImpressoras } from "@/lib/financeiro/repository";
import { validarImpressora } from "@/lib/financeiro/validacao";

/** Impressoras compradas — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  return NextResponse.json({ impressoras: await listarImpressoras() });
}

export async function POST(request: Request) {
  const { erros, dados } = validarImpressora(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  return NextResponse.json({ impressora: await criarImpressora(dados) }, { status: 201 });
}
