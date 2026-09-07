import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth/clienteConfig";
import { ErroClienteJaCadastrado, criarClienteCredenciais } from "@/lib/clientes/repository";
import { type CadastroClientePayload, validarCadastroCliente } from "@/lib/clientes/validacaoCadastro";
import { gerarCodigoVerificacao } from "@/lib/clientes/verificacaoEmail";
import { enviarCodigoVerificacao } from "@/lib/email/resend";

/**
 * Cadastro de cliente por e-mail/senha (Tarefa 10/EDI-84, US1). Correção
 * pós-EDI-84: exige confirmar um código enviado por e-mail antes de liberar
 * login — a conta é criada, mas não autenticada, exceto quando o e-mail já
 * havia sido verificado via Google (unificação, `lib/clientes/repository.ts`).
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as CadastroClientePayload;
  const erros = validarCadastroCliente(payload);

  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Dados inválidos.", campos: erros }, { status: 400 });
  }

  const nome = String(payload.nome).trim();
  const email = String(payload.email).trim();
  const senha = String(payload.senha);

  let cliente;
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    cliente = await criarClienteCredenciais({ nome, email, senhaHash });
  } catch (erro) {
    if (erro instanceof ErroClienteJaCadastrado) {
      return NextResponse.json({ erro: erro.message }, { status: 409 });
    }
    throw erro;
  }

  if (cliente.emailVerificado) {
    // Unificação com conta já verificada via Google — não precisa confirmar de novo.
    await signIn("credentials", { email, senha, redirect: false });
    return NextResponse.json({ ok: true, verificacaoPendente: false }, { status: 201 });
  }

  const codigo = await gerarCodigoVerificacao(cliente);
  await enviarCodigoVerificacao(cliente.email, codigo);

  return NextResponse.json({ ok: true, verificacaoPendente: true }, { status: 201 });
}
