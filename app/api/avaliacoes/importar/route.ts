import { NextResponse } from "next/server";
import { listarProdutosComIntegracaoExterna } from "@/lib/produtos/repository";
import { importarAvaliacoesProduto } from "@/lib/avaliacoes/importacao";

/**
 * Importa avaliações de todos os produtos com anúncio em canal externo
 * (contracts/avaliacoes-api.md). O Vercel Cron sempre dispara via GET; POST
 * fica disponível para disparo manual, com a mesma autenticação — mesmo
 * padrão de `/api/estoque/sincronizar`.
 */
async function importarAvaliacoes(request: Request): Promise<Response> {
  const segredo = request.headers.get("authorization");
  if (segredo !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const produtos = await listarProdutosComIntegracaoExterna();

  let avaliacoesImportadas = 0;
  let avaliacoesAtualizadas = 0;
  let falharam = 0;

  for (const produto of produtos) {
    const resultado = await importarAvaliacoesProduto(produto);
    avaliacoesImportadas += resultado.importadas;
    avaliacoesAtualizadas += resultado.atualizadas;
    falharam += resultado.falhas;
  }

  return NextResponse.json({
    produtosProcessados: produtos.length,
    avaliacoesImportadas,
    avaliacoesAtualizadas,
    falharam,
  });
}

export async function GET(request: Request) {
  return importarAvaliacoes(request);
}

export async function POST(request: Request) {
  return importarAvaliacoes(request);
}
