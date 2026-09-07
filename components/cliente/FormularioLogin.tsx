"use client";

import Link from "next/link";
import { useState } from "react";
import checkoutStyles from "@/components/checkout/checkout.module.css";
import { entrarComCredenciais, entrarComGoogle } from "@/lib/auth/clienteActions";
import styles from "./cliente.module.css";

export default function FormularioLogin({ callbackUrl }: { callbackUrl?: string }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [precisaVerificar, setPrecisaVerificar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setErroGeral(null);
    setPrecisaVerificar(false);

    const resultado = await entrarComCredenciais(email, senha);

    if (!resultado.ok) {
      setErroGeral(resultado.erro ?? "E-mail ou senha inválidos.");
      setPrecisaVerificar(Boolean(resultado.precisaVerificar));
      setEnviando(false);
      return;
    }

    window.location.href = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/minha-conta";
  }

  return (
    <>
      <form className={checkoutStyles.formulario} onSubmit={enviar} noValidate>
        {erroGeral && (
          <div className={checkoutStyles.erroGeral} role="alert">
            {erroGeral}
            {precisaVerificar && (
              <>
                {" "}
                <Link href={`/verificar-email?email=${encodeURIComponent(email)}`}>
                  Confirmar e-mail agora
                </Link>
              </>
            )}
          </div>
        )}
        <div className={checkoutStyles.campos}>
          <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
            <label className={checkoutStyles.rotulo} htmlFor="email">
              e-mail
            </label>
            <input
              id="email"
              type="email"
              className={checkoutStyles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
            <label className={checkoutStyles.rotulo} htmlFor="senha">
              senha
            </label>
            <input
              id="senha"
              type="password"
              className={checkoutStyles.input}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button type="submit" className={checkoutStyles.submit} disabled={enviando}>
          {enviando ? "entrando…" : "Entrar"}
        </button>
      </form>

      <div className={styles.divisor}>ou</div>

      <form action={entrarComGoogle.bind(null, callbackUrl)}>
        <button type="submit" className={styles.botaoGoogle}>
          Entrar com Google
        </button>
      </form>

      <p className={styles.rodape}>
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
      </p>
      <p className={styles.rodape}>
        Ainda não tem conta? <Link href="/cadastro">Criar conta</Link>
      </p>
    </>
  );
}
