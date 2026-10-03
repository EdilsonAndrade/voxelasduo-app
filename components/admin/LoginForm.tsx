"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalheErro, setDetalheErro] = useState<string | null>(null);

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setEntrando(true);
    setErro(null);
    setDetalheErro(null);

    try {
      const resultado = await signIn("credentials", {
        email,
        senha,
        redirect: false,
      });

      if (!resultado || resultado.error) {
        setErro("E-mail ou senha inválidos.");
        setDetalheErro(
          resultado
            ? `error: ${resultado.error} | status: ${resultado.status} | ok: ${resultado.ok} | url: ${resultado.url}`
            : "signIn não retornou resposta."
        );
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (e) {
      setErro("Não foi possível entrar. Tente novamente.");
      setDetalheErro(e instanceof Error ? `${e.name}: ${e.message}
${e.stack ?? ""}` : String(e));
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className={styles.loginCard}>
      <div className={styles.loginMarca} aria-hidden="true">
        <svg viewBox="0 0 60 60" width="40" height="40">
          <path d="M30 6 L52 18 L52 42 L30 54 L8 42 L8 18 Z" fill="none" />
          <path d="M30 6 L52 18 L30 30 L8 18 Z" fill="var(--roxo)" />
          <path d="M8 18 L30 30 L30 54 L8 42 Z" fill="var(--roxo)" opacity="0.75" />
          <path d="M52 18 L52 42 L30 54 L30 30 Z" fill="var(--roxo)" opacity="0.55" />
        </svg>
      </div>
      <p className={styles.loginSaudacao}>bem-vinda(o) de volta</p>
      <h1 className={styles.loginTitulo}>Painel Voxelas Duo</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        {erro && <span className={styles.formError}>{erro}</span>}
        {detalheErro && (
          <details>
            <summary>Detalhes técnicos</summary>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.75rem" }}>
              {detalheErro}
            </pre>
          </details>
        )}

        <div className={styles.actions}>
          <button type="submit" className={styles.btnPrimary} disabled={entrando}>
            {entrando ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
