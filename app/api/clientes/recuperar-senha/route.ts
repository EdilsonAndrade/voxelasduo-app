import { NextResponse } from "next/server";
import { buscarClientePorEmail } from "@/lib/clientes/repository";
import { gerarCodigoRecuperacao } from "@/lib/clientes/recuperacaoSenha";
import { enviarCodigoRecuperacao } from "@/lib/email/resend";

/**
 * Solicitação de recuperação de senha (Tarefa 10/EDI-84, US2). Sempre
 * responde 200 — nunca revela se o e-mail existe (FR-008/Edge Cases).
 */
export async function POST(request: Request) {
  const { email } = (await request.json().catch(() => ({}))) as { email?: unknown };

  if (typeof email === "string" && email.trim()) {
    const cliente = await buscarClientePorEmail(email);
    if (cliente?.senhaHash) {
      const codigo = await gerarCodigoRecuperacao(cliente);
      await enviarCodigoRecuperacao(cliente.email, codigo);
    }
  }

  return NextResponse.json({ ok: true });
}
