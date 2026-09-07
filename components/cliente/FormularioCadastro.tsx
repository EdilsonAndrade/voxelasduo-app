"use client";

import Link from "next/link";
import { useState } from "react";
import checkoutStyles from "@/components/checkout/checkout.module.css";
import styles from "./cliente.module.css";

interface RespostaErro {
  erro?: string;
  campos?: Record<string, string>;
}

interface RespostaCadastro {
  ok: boolean;
  verificacaoPendente: boolean;
}

export default function FormularioCadastro() {
  const [formulario, setFormulario] = useState({ nome: "", email: "", senha: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function atualizar(campo: keyof typeof formulario, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setErroGeral(null);
    setErros({});

    const resposta = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formulario),
    });

    if (resposta.status === 400) {
      const dados = (await resposta.json()) as RespostaErro;
      setErros(dados.campos ?? {});
      setEnviando(false);
      return;
    }

    if (resposta.status === 409) {
      setErroGeral("Este e-mail já tem uma conta. Que tal entrar em vez de criar uma nova?");
      setEnviando(false);
      return;
    }

    if (!resposta.ok) {
      setErroGeral("Não conseguimos criar sua conta agora. Tente novamente em instantes.");
      setEnviando(false);
      return;
    }

    const dados = (await resposta.json()) as RespostaCadastro;
    window.location.href = dados.verificacaoPendente
      ? `/verificar-email?email=${encodeURIComponent(formulario.email)}`
      : "/minha-conta";
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
          <label className={checkoutStyles.rotulo} htmlFor="nome">
            nome <span>*</span>
          </label>
          <input
            id="nome"
            className={checkoutStyles.input}
            value={formulario.nome}
            onChange={(e) => atualizar("nome", e.target.value)}
            autoComplete="name"
          />
          {erros.nome && <p className={checkoutStyles.erroCampo}>{erros.nome}</p>}
        </div>
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
          {erros.email && <p className={checkoutStyles.erroCampo}>{erros.email}</p>}
        </div>
        <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
          <label className={checkoutStyles.rotulo} htmlFor="senha">
            senha <span>*</span>
          </label>
          <input
            id="senha"
            type="password"
            className={checkoutStyles.input}
            value={formulario.senha}
            onChange={(e) => atualizar("senha", e.target.value)}
            autoComplete="new-password"
          />
          {erros.senha && <p className={checkoutStyles.erroCampo}>{erros.senha}</p>}
        </div>
      </div>

      <button type="submit" className={checkoutStyles.submit} disabled={enviando}>
        {enviando ? "criando conta…" : "Criar conta"}
      </button>

      <p className={styles.rodape}>
        Já tem conta? <Link href="/entrar">Entrar</Link>
      </p>
    </form>
  );
}
