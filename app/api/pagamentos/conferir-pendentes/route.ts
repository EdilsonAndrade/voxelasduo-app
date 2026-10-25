import { NextResponse } from "next/server";
import { conferirPendentesRecentes } from "@/lib/pagamentos/verificacao";

/**
 * Conferência diária dos Pix pendentes no Mercado Pago (EDI-132) — rede de
 * segurança para avisos que não chegaram. O Vercel Cron dispara via GET; POST
 * fica disponível com o mesmo segredo — mesmo padrão de `/api/producao/importar`.
 * Fora da proteção por sessão: autenticada pelo `CRON_SECRET`.
 */
async function conferir(request: Request): Promise<Response> {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  try {
    return NextResponse.json(await conferirPendentesRecentes());
  } catch (erro) {
    console.error("[pagamentos] falha na conferência diária de pendentes:", erro);
    return NextResponse.json({ erro: "Falha ao conferir os pagamentos pendentes." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return conferir(request);
}

export async function POST(request: Request) {
  return conferir(request);
}
