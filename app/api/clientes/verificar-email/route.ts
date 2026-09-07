import { NextResponse } from "next/server";
import { buscarClientePorEmail } from "@/lib/clientes/repository";
import { confirmarVerificacaoEmail, validarCodigoVerificacao } from "@/lib/clientes/verificacaoEmail";

/**
 * Confirma o código de verificação de e-mail do cadastro (correção
 * pós-EDI-84). Não autentica automaticamente — a página redireciona para
 * `/entrar` após o sucesso, mantendo o fluxo simples (sem reenviar a senha).
 */
export async function POST(request: Request) {
  const { email, codigo } = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    codigo?: unknown;
  };

  if (typeof email !== "string" || typeof codigo !== "string") {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const cliente = await buscarClientePorEmail(email);
  if (!cliente || !(await validarCodigoVerificacao(cliente, codigo))) {
    return NextResponse.json({ erro: "Código inválido ou expirado." }, { status: 400 });
  }

  await confirmarVerificacaoEmail(cliente);

  return NextResponse.json({ ok: true });
}
