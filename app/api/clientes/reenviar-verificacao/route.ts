import { NextResponse } from "next/server";
import { buscarClientePorEmail } from "@/lib/clientes/repository";
import { gerarCodigoVerificacao } from "@/lib/clientes/verificacaoEmail";
import { enviarCodigoVerificacao } from "@/lib/email/resend";

/** Reenvia o código de verificação (correção pós-EDI-84) — sempre 200, mesmo padrão de recuperar-senha. */
export async function POST(request: Request) {
  const { email } = (await request.json().catch(() => ({}))) as { email?: unknown };

  if (typeof email === "string" && email.trim()) {
    const cliente = await buscarClientePorEmail(email);
    if (cliente && !cliente.emailVerificado) {
      const codigo = await gerarCodigoVerificacao(cliente);
      await enviarCodigoVerificacao(cliente.email, codigo);
    }
  }

  return NextResponse.json({ ok: true });
}
