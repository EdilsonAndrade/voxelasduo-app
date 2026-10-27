import { NextResponse } from "next/server";
import { gerarProdutoDoKit } from "@/lib/kits/repository";
import { respostaDeErroKit } from "@/lib/kits/respostaErro";

type Params = { params: Promise<{ id: string }> };

/** Cria (201) ou atualiza (200) o produto rascunho do kit. */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const resultado = await gerarProdutoDoKit(id);
    return NextResponse.json(resultado, { status: resultado.criado ? 201 : 200 });
  } catch (falha) {
    return respostaDeErroKit(falha);
  }
}
