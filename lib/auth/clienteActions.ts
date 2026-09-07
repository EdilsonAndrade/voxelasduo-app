"use server";

// De "@auth/core/errors" (não "next-auth") pelo mesmo motivo de autorizarCredenciaisCliente.ts.
import { AuthError } from "@auth/core/errors";
import { ContaNaoVerificadaError } from "@/lib/auth/autorizarCredenciaisCliente";
import { signIn, signOut } from "@/lib/auth/clienteConfig";

/**
 * Server Actions do fluxo de autenticação do cliente (Tarefa 10/EDI-84,
 * research.md #9b) — chamam `signIn`/`signOut` já vinculados à instância
 * certa (`lib/auth/clienteConfig.ts`), sem depender dos helpers client-side
 * de `next-auth/react` (que resolveriam a URL errada com duas instâncias de
 * NextAuth no mesmo app).
 */
export async function entrarComCredenciais(
  email: string,
  senha: string
): Promise<{ ok: boolean; erro?: string; precisaVerificar?: boolean }> {
  try {
    await signIn("credentials", { email, senha, redirect: false });
    return { ok: true };
  } catch (erro) {
    // Checar a subclasse antes de AuthError (ContaNaoVerificadaError extends CredentialsSignin extends AuthError).
    if (erro instanceof ContaNaoVerificadaError) {
      return {
        ok: false,
        erro: "Confirme seu e-mail antes de entrar.",
        precisaVerificar: true,
      };
    }
    if (erro instanceof AuthError) {
      return { ok: false, erro: "E-mail ou senha inválidos." };
    }
    throw erro;
  }
}

function callbackUrlSegura(callbackUrl: string | undefined): string {
  return callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/minha-conta";
}

/** Vinculado via `.bind(null, callbackUrl)` a um `<form action={...}>` — o redirect para o Google é lançado pelo próprio `signIn`. */
export async function entrarComGoogle(callbackUrl: string | undefined): Promise<void> {
  await signIn("google", { redirectTo: callbackUrlSegura(callbackUrl) });
}

export async function sairCliente(): Promise<void> {
  // "/" redireciona para /produtos (app/page.tsx) — manda direto para evitar um pulo extra.
  await signOut({ redirectTo: "/produtos" });
}
