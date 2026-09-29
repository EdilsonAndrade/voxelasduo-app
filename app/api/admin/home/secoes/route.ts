import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { criarSecao, listarSecoes } from "@/lib/home/repository";
import { validarSecaoHome } from "@/lib/home/validation";

export async function GET() {
  const secoes = await listarSecoes();
  return NextResponse.json({ secoes });
}

export async function POST(request: Request) {
  const resultado = validarSecaoHome(await request.json());

  if (!resultado.ok) {
    return NextResponse.json({ erro: "Payload inválido.", campos: resultado.erros }, { status: 400 });
  }

  const secao = await criarSecao(resultado.dados);
  revalidatePath("/");

  return NextResponse.json({ secao }, { status: 201 });
}
