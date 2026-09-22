import { NextResponse } from "next/server";
import { buscarTendenciasGerais } from "@/lib/estoque/canais/mercadoLivre/tendencias";
import { obterComCache } from "@/lib/tendencias/cache";
import { TREND_CACHE_GERAIS_ID, type TrendCacheGerais } from "@/lib/models/trendCache";

function ehErroDeToken(erro: unknown): boolean {
  return (
    erro instanceof Error &&
    (erro.message.includes("renovar token") || erro.message.includes("credencial do Mercado Livre"))
  );
}

type PayloadGerais = Omit<TrendCacheGerais, "_id" | "obtidoEm">;

/**
 * Tendências gerais do Mercado Livre (EDI-107, US2/US3) — protegida pelo
 * proxy `/api/admin/*`. Mesmo cache de 24h da busca por termo, chave fixa
 * `TREND_CACHE_GERAIS_ID`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forcar = searchParams.get("forcar") === "true";

  try {
    const resultado = await obterComCache<PayloadGerais>({
      chave: TREND_CACHE_GERAIS_ID,
      forcar,
      buscarNovo: async () => ({ tipo: "gerais", termos: await buscarTendenciasGerais() }),
    });

    return NextResponse.json({
      origem: resultado.origem,
      obtidoEm: resultado.obtidoEm.toISOString(),
      avisoDesatualizado: resultado.avisoDesatualizado,
      termos: resultado.dados.termos,
    });
  } catch (erro) {
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
