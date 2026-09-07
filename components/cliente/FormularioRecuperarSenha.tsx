"use client";

import Link from "next/link";
import { useState } from "react";
import checkoutStyles from "@/components/checkout/checkout.module.css";
import styles from "./cliente.module.css";

export default function FormularioRecuperarSenha() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);

    await fetch("/api/clientes/recuperar-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setEnviando(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div>
        <p className={styles.subtitulo}>
          Se esse e-mail tiver uma conta, enviamos um código de recuperação para ele. Confira sua
          caixa de entrada e informe o código na próxima tela.
        </p>
        <p className={styles.rodape}>
          <Link href="/redefinir-senha">Já tenho o código</Link>
        </p>
      </div>
    );
  }

  return (
    <form className={checkoutStyles.formulario} onSubmit={enviar} noValidate>
      <div className={checkoutStyles.campos}>
        <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
          <label className={checkoutStyles.rotulo} htmlFor="email">
            e-mail <span>*</span>
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
      </div>

      <button type="submit" className={checkoutStyles.submit} disabled={enviando}>
        {enviando ? "enviando…" : "Enviar código"}
      </button>

      <p className={styles.rodape}>
        <Link href="/entrar">Voltar para o login</Link>
      </p>
    </form>
  );
}
