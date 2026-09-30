import { NextResponse } from "next/server";
import {
  CategoriaEquivalenteError,
  criarCategoria,
  listarCategoriasAdmin,
  paraCategoriaAdmin,
} from "@/lib/categorias/repository";
import { validarNomeCategoria } from "@/lib/categorias/validation";
import { revalidarVitrine } from "@/lib/categorias/revalidar";

export async function GET() {
  return NextResponse.json({ categorias: await listarCategoriasAdmin() });
}

export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { nome?: unknown } | null;
  const erroNome = validarNomeCategoria(corpo?.nome);
  if (erroNome) {
    return NextResponse.json({ erro: "Payload inválido.", campos: { nome: erroNome } }, { status: 400 });
  }

  try {
    const categoria = await criarCategoria(corpo!.nome as string);
    revalidarVitrine();
    return NextResponse.json({ categoria: paraCategoriaAdmin(categoria) }, { status: 201 });
  } catch (erro) {
    if (erro instanceof CategoriaEquivalenteError) {
      return NextResponse.json({ erro: erro.message }, { status: 409 });
    }
    throw erro;
  }
}
