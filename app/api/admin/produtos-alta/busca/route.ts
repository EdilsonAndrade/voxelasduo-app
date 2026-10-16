import { NextResponse } from "next/server";
import { validarCategoria } from "@/lib/produtosAlta/categorias";
import { dependenciasReais } from "@/lib/produtosAlta/dependencias";
import { respostaDeErroProdutosAlta } from "@/lib/produtosAlta/erros";
import { buscarPorNome } from "@/lib/produtosAlta/listas";
import { normalizarTermo, obterComCache } from "@/lib/tendencias/cache";
import type { ListaEmAlta } from "@/lib/models/produtosAlta";

export const maxDuration = 60;

/**
 * Busca por nome no catálogo do ML (specs/033, US4): dentro da categoria
 * quando informada, senão no catálogo todo. Cache de 24h por categoria + termo.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const termo = (searchParams.get("termo") ?? "").trim();
  if (!termo) {
    return NextResponse.json(
      { erro: "termo_invalido", mensagem: "Informe um nome para pesquisar." },
      { status: 400 }
    );
  }

  const deps = dependenciasReais();
  const idCategoria = searchParams.get("categoria");

  try {
    const categoria = idCategoria ? await validarCategoria(idCategoria, deps.categoria) : undefined;
    const resultado = await obterComCache<ListaEmAlta>({
      chave: `alta:busca:${categoria?.id ?? "todas"}:${normalizarTermo(termo)}`,
      forcar: searchParams.get("forcar") === "true",
      buscarNovo: async () => ({ tipo: "alta", itens: await buscarPorNome(termo, categoria, deps) }),
    });

    return NextResponse.json({
      termo,
      categoriaId: categoria?.id,
      itens: resultado.dados.itens,
      origem: resultado.origem,
      obtidoEm: resultado.obtidoEm.toISOString(),
      avisoDesatualizado: resultado.avisoDesatualizado,
    });
  } catch (erro) {
    const { status, corpo } = respostaDeErroProdutosAlta(erro);
    return NextResponse.json(corpo, { status });
  }
}
