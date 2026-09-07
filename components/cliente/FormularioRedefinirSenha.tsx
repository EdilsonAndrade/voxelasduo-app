"use client";

import { useState } from "react";
import checkoutStyles from "@/components/checkout/checkout.module.css";
import styles from "./cliente.module.css";

export default function FormularioRedefinirSenha() {
  const [formulario, setFormulario] = useState({ email: "", codigo: "", novaSenha: "" });
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function atualizar(campo: keyof typeof formulario, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setErroGeral(null);

    const resposta = await fetch("/api/clientes/redefinir-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formulario),
    });

    if (!resposta.ok) {
      const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
      setErroGeral(dados.erro ?? "Não foi possível redefinir sua senha agora.");
      setEnviando(false);
      return;
    }

    setSucesso(true);
  }

  if (sucesso) {
    return (
      <p className={styles.subtitulo}>
        Senha redefinida! Você já pode <a href="/entrar">entrar</a> com a nova senha.
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
            value={formulario.email}
            onChange={(e) => atualizar("email", e.target.value)}
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
            value={formulario.codigo}
            onChange={(e) => atualizar("codigo", e.target.value)}
            inputMode="numeric"
            maxLength={6}
          />
        </div>
        <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
          <label className={checkoutStyles.rotulo} htmlFor="novaSenha">
            nova senha <span>*</span>
          </label>
          <input
            id="novaSenha"
            type="password"
            className={checkoutStyles.input}
            value={formulario.novaSenha}
            onChange={(e) => atualizar("novaSenha", e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>

      <button type="submit" className={checkoutStyles.submit} disabled={enviando}>
        {enviando ? "salvando…" : "Redefinir senha"}
      </button>
    </form>
  );
}
