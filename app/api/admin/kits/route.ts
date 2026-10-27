import { NextResponse } from "next/server";
import { listarKits, salvarKit } from "@/lib/kits/repository";
import { respostaDeErroKit } from "@/lib/kits/respostaErro";
import { validarKit } from "@/lib/kits/validation";

/** Montador de kits (specs/037) — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  const kits = await listarKits();
  return NextResponse.json({ kits });
}

export async function POST(request: Request) {
  const { dados, erro } = validarKit(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro }, { status: 400 });

  try {
    const resultado = await salvarKit(null, dados);
    return NextResponse.json(resultado, { status: 201 });
  } catch (falha) {
    return respostaDeErroKit(falha);
  }
}
