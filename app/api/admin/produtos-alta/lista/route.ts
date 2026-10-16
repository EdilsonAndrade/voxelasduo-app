import { NextResponse } from "next/server";
import { validarCategoria } from "@/lib/produtosAlta/categorias";
import { dependenciasReais } from "@/lib/produtosAlta/dependencias";
import { respostaDeErroProdutosAlta } from "@/lib/produtosAlta/erros";
import { listarMaisProcurados, listarMaisVendidos } from "@/lib/produtosAlta/listas";
import { obterComCache } from "@/lib/tendencias/cache";
import type { ListaEmAlta, OrdemLista } from "@/lib/models/produtosAlta";

/** Sem cache, até ~20 consultas ao ML (4 por vez). */
export const maxDuration = 60;

const ORDENS = new Set<OrdemLista>(["vendidos", "procurados"]);

/**
 * Mais vendidos ou mais procurados de uma categoria 3D ou subcategoria
 * (specs/033, US1/US2/US5) — protegida pelo proxy `/api/admin/*`. Cache de
 * 24h por categoria + ordem; falha com resultado antigo devolve o antigo
 * com `avisoDesatualizado`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ordem = searchParams.get("ordem") as OrdemLista;
  if (!ORDENS.has(ordem)) {
    return NextResponse.json(
      { erro: "ordem_invalida", mensagem: "Ordene por mais vendidos ou mais procurados." },
      { status: 400 }
    );
  }

  const deps = dependenciasReais();

  try {
    const categoria = await validarCategoria(searchParams.get("categoria") ?? "", deps.categoria);
    const resultado = await obterComCache<ListaEmAlta>({
      chave: `alta:${ordem}:${categoria.id}`,
      forcar: searchParams.get("forcar") === "true",
      buscarNovo: async () => ({
        tipo: "alta",
        itens:
          ordem === "vendidos"
            ? await listarMaisVendidos(categoria, deps)
            : await listarMaisProcurados(categoria, deps),
      }),
    });

    return NextResponse.json({
      categoriaId: categoria.id,
      categoriaNome: categoria.nome,
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
