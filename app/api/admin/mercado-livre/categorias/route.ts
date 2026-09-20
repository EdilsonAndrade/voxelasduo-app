import { NextResponse } from "next/server";
import {
  buscarCategorias,
  listarCategoriasRaiz,
  obterCategoria,
} from "@/lib/estoque/canais/mercadoLivre/catalogoCategorias";

/**
 * Alimenta o seletor de categoria do Mercado Livre no admin de produtos:
 * - sem parâmetros: categorias de nível 1;
 * - `?pai=MLB1574`: a categoria e as filhas dela (vazio em `filhas` = folha);
 * - `?busca=texto`: folhas sugeridas pelo previsor do Mercado Livre.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pai = searchParams.get("pai")?.trim();
  const busca = searchParams.get("busca");

  try {
    if (busca !== null) {
      return NextResponse.json({ resultados: await buscarCategorias(busca) });
    }

    if (pai) {
      if (!/^[A-Za-z0-9]+$/.test(pai)) {
        return NextResponse.json({ erro: "Categoria inválida." }, { status: 400 });
      }
      return NextResponse.json(await obterCategoria(pai));
    }

    return NextResponse.json({ filhas: await listarCategoriasRaiz() });
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : "Erro desconhecido";
    return NextResponse.json({ erro: motivo }, { status: 502 });
  }
}
