import { NextResponse } from "next/server";
import { criarClienteBambu, ErroBambu } from "@/lib/producao/bambu/cliente";

/**
 * Reenvia o código de verificação por e-mail (contracts/producao-api.md) —
 * existe porque o código expira e o vendedor pode precisar de outro sem
 * repetir a senha.
 */
export async function POST(request: Request) {
  let email: string | undefined;
  try {
    ({ email } = (await request.json()) as { email?: string });
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  if (!email?.trim()) {
    return NextResponse.json({ erro: "Informe o e-mail da conta." }, { status: 400 });
  }

  try {
    await criarClienteBambu().solicitarCodigo(email.trim());
    return NextResponse.json({ enviado: true });
  } catch (erro) {
    if (erro instanceof ErroBambu) {
      return NextResponse.json({ erro: erro.message }, { status: erro.status === 401 ? 401 : 502 });
    }
    const mensagem = erro instanceof Error ? erro.message : "Falha ao solicitar o código.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
