import { NextResponse } from "next/server";
import {
  CategoriaEquivalenteError,
  CategoriaPadraoError,
  paraCategoriaAdmin,
  removerCategoria,
  renomearCategoria,
} from "@/lib/categorias/repository";
import { validarNomeCategoria } from "@/lib/categorias/validation";
import { revalidarVitrine } from "@/lib/categorias/revalidar";

type Params = { params: Promise<{ id: string }> };

const NAO_ENCONTRADA = { erro: "Categoria não encontrada." };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const corpo = (await request.json().catch(() => null)) as { nome?: unknown } | null;
  const erroNome = validarNomeCategoria(corpo?.nome);
  if (erroNome) {
    return NextResponse.json({ erro: "Payload inválido.", campos: { nome: erroNome } }, { status: 400 });
  }

  try {
    const categoria = await renomearCategoria(id, corpo!.nome as string);
    if (!categoria) return NextResponse.json(NAO_ENCONTRADA, { status: 404 });
    revalidarVitrine();
    return NextResponse.json({ categoria: paraCategoriaAdmin(categoria) });
  } catch (erro) {
    if (erro instanceof CategoriaEquivalenteError) {
      return NextResponse.json({ erro: erro.message }, { status: 409 });
    }
    throw erro;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const resultado = await removerCategoria(id);
    if (!resultado) return NextResponse.json(NAO_ENCONTRADA, { status: 404 });
    revalidarVitrine();
    return NextResponse.json(resultado);
  } catch (erro) {
    if (erro instanceof CategoriaPadraoError) {
      return NextResponse.json({ erro: erro.message }, { status: 403 });
    }
    throw erro;
  }
}
