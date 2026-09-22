import { NextResponse } from "next/server";
import {
  buscarMaisVendidosCategoria,
  preverCategoriaParaTendencia,
} from "@/lib/estoque/canais/mercadoLivre/tendencias";
import { ErroNaoEncontrado, normalizarTermo, obterComCache } from "@/lib/tendencias/cache";
import type { TrendCacheBusca } from "@/lib/models/trendCache";

/**
 * Falha na renovação/leitura do token do app (`auth.ts`) — distinta de uma
 * falha genérica de disponibilidade/limite do Mercado Livre (FR-014). Não há
 * um tipo de erro dedicado em `auth.ts` (usado por várias integrações), então
 * reconhecemos pelas mensagens que ele já lança.
 */
function ehErroDeToken(erro: unknown): boolean {
  return (
    erro instanceof Error &&
    (erro.message.includes("renovar token") || erro.message.includes("credencial do Mercado Livre"))
  );
}

type PayloadBusca = Omit<TrendCacheBusca, "_id" | "obtidoEm">;

/**
 * Descoberta de tendências por termo (EDI-107, US1/US3/US4) — protegida pelo
 * proxy `/api/admin/*`. Categoria + ranking são resolvidos juntos dentro do
 * cache de 24h (`obterComCache`, chave = termo normalizado): numa busca
 * repetida em cache, nenhuma chamada ao Mercado Livre é feita — nem para
 * resolver a categoria (FR-008).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const termo = (searchParams.get("termo") ?? "").trim();
  const forcar = searchParams.get("forcar") === "true";

  if (!termo) {
    return NextResponse.json(
      { erro: "termo_invalido", mensagem: "Informe um termo para pesquisar." },
      { status: 400 }
    );
  }

  try {
    const resultado = await obterComCache<PayloadBusca>({
      chave: normalizarTermo(termo),
      forcar,
      buscarNovo: async () => {
        const categoria = await preverCategoriaParaTendencia(termo);
        if (!categoria) {
          throw new ErroNaoEncontrado("categoria_nao_encontrada");
        }
        const ranking = await buscarMaisVendidosCategoria(categoria.categoryId);
        return {
          tipo: "busca",
          categoriaId: categoria.categoryId,
          categoriaNome: categoria.categoriaNome,
          ranking,
        };
      },
    });

    return NextResponse.json({
      termo,
      origem: resultado.origem,
      obtidoEm: resultado.obtidoEm.toISOString(),
      avisoDesatualizado: resultado.avisoDesatualizado,
      categoriaId: resultado.dados.categoriaId,
      categoriaNome: resultado.dados.categoriaNome,
      ranking: resultado.dados.ranking,
    });
  } catch (erro) {
    if (erro instanceof ErroNaoEncontrado) {
      return NextResponse.json(
        {
          erro: "categoria_nao_encontrada",
          mensagem: "Não foi possível identificar uma categoria do Mercado Livre para este termo.",
        },
        { status: 404 }
      );
    }

    if (ehErroDeToken(erro)) {
      return NextResponse.json(
        { erro: "token_invalido", mensagem: "Reconecte a conta do Mercado Livre para continuar." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        erro: "falha_mercado_livre",
        mensagem: "Não foi possível consultar o Mercado Livre no momento.",
      },
      { status: 502 }
    );
  }
}
