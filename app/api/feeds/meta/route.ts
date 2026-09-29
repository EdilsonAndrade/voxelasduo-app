import { NextResponse } from "next/server";
import { listarProdutosPublicadosMeta } from "@/lib/produtos/repository";
import { gerarCsvFeedMeta } from "@/lib/produtos/feedMeta";
import { urlBaseSite } from "@/lib/site/url";

// A Meta lê este feed em horário programado — sempre dados atuais, nunca cache.
export const dynamic = "force-dynamic";

/**
 * Feed público do catálogo da Meta (EDI-109) — fora do matcher do `proxy.ts`,
 * pois a Meta busca sem sessão. Ver specs/022-meta-catalogo-facebook/contracts/feed-meta.md.
 */
export async function GET() {
  try {
    const produtos = await listarProdutosPublicadosMeta();
    const csv = gerarCsvFeedMeta(produtos, urlBaseSite());

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (erro) {
    // Nunca responder um CSV vazio: a Meta apagaria todos os itens do catálogo.
    console.error("[feeds/meta] Falha ao gerar o feed do catálogo:", erro);
    return NextResponse.json(
      { erro: "Não foi possível gerar o feed do catálogo." },
      { status: 500 }
    );
  }
}
