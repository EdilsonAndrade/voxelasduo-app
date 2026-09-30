import { NextResponse } from "next/server";
import { OrdemCategoriasInvalidaError, reordenarCategorias } from "@/lib/categorias/repository";
import { revalidarVitrine } from "@/lib/categorias/revalidar";

export async function PUT(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = corpo?.ids;

  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ erro: "Envie { ids: string[] }." }, { status: 400 });
  }

  try {
    await reordenarCategorias(ids);
    revalidarVitrine();
    return new NextResponse(null, { status: 204 });
  } catch (erro) {
    if (erro instanceof OrdemCategoriasInvalidaError) {
      return NextResponse.json({ erro: erro.message }, { status: 400 });
    }
    throw erro;
  }
}
