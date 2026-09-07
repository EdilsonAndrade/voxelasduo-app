import { NextResponse } from "next/server";
import { buscarClientePorEmail } from "@/lib/clientes/repository";
import { definirNovaSenha, validarCodigoRecuperacao } from "@/lib/clientes/recuperacaoSenha";

const SENHA_TAMANHO_MINIMO = 8;

/** Valida o código e define a nova senha (Tarefa 10/EDI-84, US2). */
export async function POST(request: Request) {
  const { email, codigo, novaSenha } = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    codigo?: unknown;
    novaSenha?: unknown;
  };

  if (
    typeof email !== "string" ||
    typeof codigo !== "string" ||
    typeof novaSenha !== "string" ||
    novaSenha.length < SENHA_TAMANHO_MINIMO
  ) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const cliente = await buscarClientePorEmail(email);
  if (!cliente || !(await validarCodigoRecuperacao(cliente, codigo))) {
    return NextResponse.json({ erro: "Código inválido ou expirado." }, { status: 400 });
  }

  await definirNovaSenha(cliente, novaSenha);

  return NextResponse.json({ ok: true });
}
