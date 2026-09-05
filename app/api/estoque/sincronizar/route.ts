import { NextResponse } from "next/server";
import { listarElegiveisParaRetry } from "@/lib/estoque/fila";
import { reprocessarPendencia } from "@/lib/estoque/sincronizacao";

/**
 * Reprocessa a fila de sincronização de estoque (contracts/estoque-api.md).
 * O Vercel Cron sempre dispara via GET; POST fica disponível para disparo
 * manual (ex: pelo responsável da loja) com a mesma autenticação.
 */
async function processarFila(request: Request): Promise<Response> {
  const segredo = request.headers.get("authorization");
  if (segredo !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const elegiveis = await listarElegiveisParaRetry();

  let sincronizados = 0;
  let falharam = 0;
  for (const registro of elegiveis) {
    const sucesso = await reprocessarPendencia(registro);
    if (sucesso) {
      sincronizados++;
    } else {
      falharam++;
    }
  }

  return NextResponse.json({ processados: elegiveis.length, sincronizados, falharam });
}

export async function GET(request: Request) {
  return processarFila(request);
}

export async function POST(request: Request) {
  return processarFila(request);
}
