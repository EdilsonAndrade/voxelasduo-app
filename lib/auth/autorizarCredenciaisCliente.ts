import bcrypt from "bcryptjs";
// Importado de `@auth/core/errors` (não de "next-auth") para não puxar a
// cadeia de módulos de `next-auth/lib/env.js` (que importa `next/server` de um
// jeito que o resolvedor do Vitest não suporta) só para lançar um erro.
import { CredentialsSignin } from "@auth/core/errors";
import { buscarClientePorEmail } from "@/lib/clientes/repository";

export interface ClienteAutenticado {
  id: string;
  email: string;
  name: string;
}

/**
 * Lançado quando e-mail/senha estão corretos mas o e-mail ainda não foi
 * verificado (correção pós-EDI-84) — diferente de credenciais inválidas, para
 * a UI poder orientar o cliente a confirmar o e-mail em vez de mostrar
 * "senha incorreta".
 */
export class ContaNaoVerificadaError extends CredentialsSignin {
  code = "conta-nao-verificada";
}

/**
 * Lógica do Credentials provider do cliente (Tarefa 10/EDI-84), extraída do
 * NextAuth config para poder ser testada isoladamente — mesmo padrão de
 * `lib/auth/autorizarCredenciais.ts` (admin). Retorna `null` também quando o
 * cliente existe mas só tem login por Google (sem `senhaHash`), sem indicar
 * isso na mensagem de erro (mesma mensagem genérica para qualquer falha).
 */
export async function autorizarCredenciaisCliente(
  credentials: Partial<Record<"email" | "senha", unknown>> | undefined
): Promise<ClienteAutenticado | null> {
  const email = String(credentials?.email ?? "")
    .trim()
    .toLowerCase();
  const senha = String(credentials?.senha ?? "");

  if (!email || !senha) {
    return null;
  }

  const cliente = await buscarClientePorEmail(email);

  if (!cliente || !cliente.senhaHash) {
    return null;
  }

  const senhaValida = await bcrypt.compare(senha, cliente.senhaHash);
  if (!senhaValida) {
    return null;
  }

  if (!cliente.emailVerificado) {
    throw new ContaNaoVerificadaError();
  }

  return {
    id: cliente._id!.toString(),
    email: cliente.email,
    name: cliente.nome,
  };
}
