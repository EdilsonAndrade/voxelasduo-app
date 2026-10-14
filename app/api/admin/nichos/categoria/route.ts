import { NextResponse } from "next/server";
import { buscarCategoriaNicho } from "@/lib/nichos/categorias";
import { dependenciasReais } from "@/lib/nichos/dependencias";
import { respostaDeErroNichos } from "@/lib/nichos/erros";
import { filtrosDaQuery, sufixoFiltros } from "@/lib/nichos/filtros";
import { pesquisarCategoria } from "@/lib/nichos/pesquisa";
import { obterComCache } from "@/lib/tendencias/cache";
import type { ResultadoNichosCategoria } from "@/lib/models/nicho";

/** Sem cache, uma categoria faz ~60 consultas espaçadas ao MakerWorld (research.md #8). */
export const maxDuration = 300;

/**
 * Oportunidades de uma categoria (specs/030, US1) — protegida pelo proxy
 * `/api/admin/*`. Cache de 24h por categoria + filtros; falha com resultado
 * antigo disponível devolve o antigo com `avisoDesatualizado`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoria = buscarCategoriaNicho(searchParams.get("id") ?? "");
  if (!categoria) {
    return NextResponse.json(
      { erro: "categoria_invalida", mensagem: "Escolha uma das categorias da lista." },
      { status: 400 }
    );
  }

  const filtros = filtrosDaQuery(searchParams);

  try {
    const resultado = await obterComCache<ResultadoNichosCategoria>({
      chave: `nichos:cat:${categoria.id}:${sufixoFiltros(filtros)}`,
      forcar: searchParams.get("forcar") === "true",
      buscarNovo: () => pesquisarCategoria(categoria, filtros, dependenciasReais()),
    });

    const { tipo, ...dados } = resultado.dados;
    void tipo;
    return NextResponse.json({
      ...dados,
      origem: resultado.origem,
      obtidoEm: resultado.obtidoEm.toISOString(),
      avisoDesatualizado: resultado.avisoDesatualizado,
    });
  } catch (erro) {
    const { status, corpo } = respostaDeErroNichos(erro);
    return NextResponse.json(corpo, { status });
  }
}
