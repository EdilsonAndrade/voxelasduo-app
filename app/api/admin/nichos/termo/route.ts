import { NextResponse } from "next/server";
import { dependenciasReais } from "@/lib/nichos/dependencias";
import { respostaDeErroNichos } from "@/lib/nichos/erros";
import { filtrosDaQuery, sufixoFiltros } from "@/lib/nichos/filtros";
import { pesquisarTermo } from "@/lib/nichos/pesquisa";
import { normalizarTermo, obterComCache } from "@/lib/tendencias/cache";
import type { ResultadoNichosTermo } from "@/lib/models/nicho";

export const maxDuration = 60;

/** Modelos e concorrência para um nome livre ou tirado de um link (specs/030, US3). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const termo = (searchParams.get("termo") ?? "").trim();
  if (!termo) {
    return NextResponse.json(
      { erro: "termo_invalido", mensagem: "Digite o nome do produto para pesquisar." },
      { status: 400 }
    );
  }

  const filtros = filtrosDaQuery(searchParams);

  try {
    const resultado = await obterComCache<ResultadoNichosTermo>({
      chave: `nichos:termo:${normalizarTermo(termo)}:${sufixoFiltros(filtros)}`,
      forcar: searchParams.get("forcar") === "true",
      buscarNovo: () => pesquisarTermo(termo, filtros, dependenciasReais()),
    });

    return NextResponse.json({
      termo: resultado.dados.termo,
      oportunidade: resultado.dados.oportunidade,
      origem: resultado.origem,
      obtidoEm: resultado.obtidoEm.toISOString(),
      avisoDesatualizado: resultado.avisoDesatualizado,
    });
  } catch (erro) {
    const { status, corpo } = respostaDeErroNichos(erro);
    return NextResponse.json(corpo, { status });
  }
}
