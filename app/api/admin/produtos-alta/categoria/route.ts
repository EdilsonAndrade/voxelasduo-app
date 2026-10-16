import { NextResponse } from "next/server";
import { validarCategoria } from "@/lib/produtosAlta/categorias";
import { dependenciasReais } from "@/lib/produtosAlta/dependencias";
import { respostaDeErroProdutosAlta } from "@/lib/produtosAlta/erros";

/** Caminho e subcategorias de uma categoria 3D (specs/033 FR-013) — guardado 7 dias. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const categoria = await validarCategoria(searchParams.get("id") ?? "", dependenciasReais().categoria);
    return NextResponse.json(categoria);
  } catch (erro) {
    const { status, corpo } = respostaDeErroProdutosAlta(erro);
    return NextResponse.json(corpo, { status });
  }
}
