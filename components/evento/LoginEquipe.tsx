"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { AREA_EVENTO } from "@/lib/auth/papeis";
import styles from "./evento.module.css";

/**
 * Login da equipe de evento (EDI-125). Formulário real com name/autocomplete
 * de usuário e senha para o navegador oferecer salvar e preencher sozinho.
 */
export default function LoginEquipe() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setEntrando(true);
    setErro(null);

    try {
      const resultado = await signIn("credentials", { email: usuario.trim(), senha, redirect: false });
      if (!resultado || resultado.error) {
        setErro("Usuário ou senha incorretos. Depois de muitas tentativas erradas, espere 15 minutos.");
        setEntrando(false);
        return;
      }
      // Navegação completa: o service worker guarda a tela para usar sem internet.
      window.location.assign(AREA_EVENTO);
    } catch {
      setErro("Sem internet. Para entrar, conecte-se e tente de novo.");
      setEntrando(false);
    }
  }

  return (
    <main className={styles.login}>
      <div className={styles.loginCubos} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className={styles.loginNota}>bora anotar pedidos!</p>
      <h1 className={styles.loginTitulo}>Pedidos de evento</h1>

      <form className={styles.loginForm} onSubmit={entrar} method="post" action={AREA_EVENTO}>
        <label className={styles.campo}>
          <span className={styles.rotulo}>Usuário</span>
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ex.: malu"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            className={styles.input}
          />
        </label>

        <label className={styles.campo}>
          <span className={styles.rotulo}>Senha</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className={styles.input}
          />
        </label>

        {erro && (
          <p className={styles.erroGeral} role="alert">
            {erro}
          </p>
        )}

        <button type="submit" className={styles.botaoPrincipal} disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
