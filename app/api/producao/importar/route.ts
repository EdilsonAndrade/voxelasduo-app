import { NextResponse } from "next/server";
import {
  executarImportacao,
  mensagemDoErro,
  statusDoErro,
} from "@/lib/producao/servico";

/**
 * Importa o histórico de impressão da Bambu Lab (contracts/producao-api.md).
 * O Vercel Cron sempre dispara via GET; POST fica disponível para disparo com
 * o mesmo segredo — mesmo padrão de `/api/estoque/sincronizar`.
 *
 * Esta rota é deliberadamente **fora** da proteção por sessão
 * (`lib/auth/rotaProtegida.ts`): quem a chama é o cron, autenticado pelo
 * `CRON_SECRET`. O disparo pelo painel é `/api/producao/importar-agora`.
 */
async function importar(request: Request): Promise<Response> {
  const segredo = request.headers.get("authorization");
  if (segredo !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  try {
    const resultado = await executarImportacao("automatica");
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json({ erro: mensagemDoErro(erro) }, { status: statusDoErro(erro) });
  }
}

export async function GET(request: Request) {
  return importar(request);
}

export async function POST(request: Request) {
  return importar(request);
}
