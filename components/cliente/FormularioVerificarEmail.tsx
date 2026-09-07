"use client";

import { useState } from "react";
import checkoutStyles from "@/components/checkout/checkout.module.css";
import styles from "./cliente.module.css";

export default function FormularioVerificarEmail({ emailInicial }: { emailInicial?: string }) {
  const [email, setEmail] = useState(emailInicial ?? "");
  const [codigo, setCodigo] = useState("");
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [mensagemReenvio, setMensagemReenvio] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setErroGeral(null);
    setMensagemReenvio(null);

    const resposta = await fetch("/api/clientes/verificar-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, codigo }),
    });

    if (!resposta.ok) {
      const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
      setErroGeral(dados.erro ?? "Não foi possível confirmar seu e-mail agora.");
      setEnviando(false);
      return;
    }

    setSucesso(true);
  }

  async function reenviar() {
    if (reenviando || !email) return;
    setReenviando(true);
    setMensagemReenvio(null);

    await fetch("/api/clientes/reenviar-verificacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setReenviando(false);
    setMensagemReenvio("Se essa conta ainda não foi confirmada, reenviamos o código.");
  }

  if (sucesso) {
    return (
      <p className={styles.subtitulo}>
        E-mail confirmado! Você já pode <a href="/entrar">entrar</a> normalmente.
      </p>
    );
  }

  return (
    <form className={checkoutStyles.formulario} onSubmit={enviar} noValidate>
      {erroGeral && (
        <div className={checkoutStyles.erroGeral} role="alert">
          {erroGeral}
        </div>
      )}
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
        <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
          <label className={checkoutStyles.rotulo} htmlFor="codigo">
            código recebido por e-mail <span>*</span>
          </label>
          <input
            id="codigo"
            className={checkoutStyles.input}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            inputMode="numeric"
            maxLength={6}
          />
        </div>
      </div>

      <button type="submit" className={checkoutStyles.submit} disabled={enviando}>
        {enviando ? "confirmando…" : "Confirmar e-mail"}
      </button>

      <p className={styles.rodape}>
        Não recebeu?{" "}
        <button
          type="button"
          onClick={reenviar}
          disabled={reenviando || !email}
          className={styles.linkBotao}
        >
          {reenviando ? "reenviando…" : "reenviar código"}
        </button>
      </p>
      {mensagemReenvio && <p className={styles.subtitulo}>{mensagemReenvio}</p>}
    </form>
  );
}
