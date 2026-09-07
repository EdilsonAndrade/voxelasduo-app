"use client";

import { useState } from "react";
import checkoutStyles from "@/components/checkout/checkout.module.css";
import { buscarEnderecoPorCep } from "@/lib/cep/buscarEnderecoPorCep";
import type { EnderecoCliente } from "@/lib/models/cliente";
import styles from "./cliente.module.css";

interface FormularioDadosCadastraisProps {
  telefoneInicial?: string;
  enderecoInicial?: EnderecoCliente;
}

const ENDERECO_VAZIO: EnderecoCliente = {
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
};

export default function FormularioDadosCadastrais({
  telefoneInicial,
  enderecoInicial,
}: FormularioDadosCadastraisProps) {
  const [telefone, setTelefone] = useState(telefoneInicial ?? "");
  const [endereco, setEndereco] = useState<EnderecoCliente>(enderecoInicial ?? ENDERECO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);

  function atualizarEndereco(campo: keyof EnderecoCliente, valor: string) {
    setEndereco((atual) => ({ ...atual, [campo]: valor }));
  }

  async function buscarCep(valor: string) {
    atualizarEndereco("cep", valor);
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    const encontrado = await buscarEnderecoPorCep(digitos);
    setBuscandoCep(false);
    if (encontrado) {
      setEndereco((atual) => ({
        ...atual,
        logradouro: encontrado.logradouro || atual.logradouro,
        bairro: encontrado.bairro || atual.bairro,
        cidade: encontrado.cidade || atual.cidade,
        estado: encontrado.estado || atual.estado,
      }));
    }
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando) return;
    setSalvando(true);
    setMensagem(null);

    const resposta = await fetch("/api/clientes/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone, endereco }),
    });

    setSalvando(false);
    setMensagem(resposta.ok ? "Dados salvos!" : "Não foi possível salvar agora.");
  }

  return (
    <form className={checkoutStyles.formulario} onSubmit={enviar} noValidate>
      {mensagem && <p className={styles.subtitulo}>{mensagem}</p>}

      <div className={checkoutStyles.campos}>
        <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
          <label className={checkoutStyles.rotulo} htmlFor="telefone">
            telefone
          </label>
          <input
            id="telefone"
            type="tel"
            className={checkoutStyles.input}
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-8888"
          />
        </div>
        <div className={checkoutStyles.campo}>
          <label className={checkoutStyles.rotulo} htmlFor="cep">
            CEP
          </label>
          <input
            id="cep"
            className={checkoutStyles.input}
            value={endereco.cep}
            onChange={(e) => buscarCep(e.target.value)}
            autoComplete="postal-code"
          />
          {buscandoCep && <p className={checkoutStyles.statusCampo}>buscando endereço…</p>}
        </div>
        <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
          <label className={checkoutStyles.rotulo} htmlFor="logradouro">
            rua
          </label>
          <input
            id="logradouro"
            className={checkoutStyles.input}
            value={endereco.logradouro}
            onChange={(e) => atualizarEndereco("logradouro", e.target.value)}
          />
        </div>
        <div className={checkoutStyles.campo}>
          <label className={checkoutStyles.rotulo} htmlFor="numero">
            número
          </label>
          <input
            id="numero"
            className={checkoutStyles.input}
            value={endereco.numero}
            onChange={(e) => atualizarEndereco("numero", e.target.value)}
          />
        </div>
        <div className={checkoutStyles.campo}>
          <label className={checkoutStyles.rotulo} htmlFor="complemento">
            complemento
          </label>
          <input
            id="complemento"
            className={checkoutStyles.input}
            value={endereco.complemento ?? ""}
            onChange={(e) => atualizarEndereco("complemento", e.target.value)}
          />
        </div>
        <div className={checkoutStyles.campo}>
          <label className={checkoutStyles.rotulo} htmlFor="bairro">
            bairro
          </label>
          <input
            id="bairro"
            className={checkoutStyles.input}
            value={endereco.bairro}
            onChange={(e) => atualizarEndereco("bairro", e.target.value)}
          />
        </div>
        <div className={checkoutStyles.campo}>
          <label className={checkoutStyles.rotulo} htmlFor="cidade">
            cidade
          </label>
          <input
            id="cidade"
            className={checkoutStyles.input}
            value={endereco.cidade}
            onChange={(e) => atualizarEndereco("cidade", e.target.value)}
          />
        </div>
        <div className={checkoutStyles.campo}>
          <label className={checkoutStyles.rotulo} htmlFor="estado">
            estado
          </label>
          <input
            id="estado"
            className={checkoutStyles.input}
            value={endereco.estado}
            onChange={(e) => atualizarEndereco("estado", e.target.value.toUpperCase())}
            maxLength={2}
          />
        </div>
      </div>

      <button type="submit" className={checkoutStyles.submit} disabled={salvando}>
        {salvando ? "salvando…" : "Salvar dados"}
      </button>
    </form>
  );
}
