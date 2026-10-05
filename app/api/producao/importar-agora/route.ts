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
 *
 * Aceita `deviceId` para importar só de uma impressora; sem ele, traz o
 * histórico de todas as máquinas da conta.
 */
export async function POST(request: Request) {
  let deviceId: string | undefined;
  try {
    ({ deviceId } = (await request.json()) as { deviceId?: string });
  } catch {
    // Corpo vazio é válido: significa "todas as impressoras".
  }

  try {
    const resultado = await executarImportacao("manual", deviceId?.trim() || undefined);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json({ erro: mensagemDoErro(erro) }, { status: statusDoErro(erro) });
  }
}
