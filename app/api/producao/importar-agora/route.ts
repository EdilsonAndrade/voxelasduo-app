import { NextResponse } from "next/server";
import {
  executarImportacao,
  mensagemDoErro,
  statusDoErro,
} from "@/lib/producao/servico";

/**
 * Disparo manual da importação pelo painel (FR-009). Rota separada da do cron
 * para que o navegador nunca precise conhecer o `CRON_SECRET` — aqui a
 * autenticação é a sessão do admin, aplicada em `lib/auth/rotaProtegida.ts`.
 */
export async function POST() {
  try {
    const resultado = await executarImportacao("manual");
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json({ erro: mensagemDoErro(erro) }, { status: statusDoErro(erro) });
  }
}
