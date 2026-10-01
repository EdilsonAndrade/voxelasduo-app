"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AvisoSpam from "@/components/AvisoSpam";
import checkoutStyles from "@/components/checkout/checkout.module.css";
import {
  DESCRICAO_TAMANHO_MAXIMO,
  IMAGEM_TIPOS_ACEITOS,
  IMAGENS_QUANTIDADE_MAXIMA,
  validarEncomenda,
  validarImagensEncomenda,
  type ErrosValidacao,
} from "@/lib/encomendas/validacao";
import styles from "./encomendas.module.css";

const WHATSAPP_TEXTO = "(19) 98157-5723";
const WHATSAPP_URL = "https://wa.me/5519981575723";

export default function FormularioEncomenda() {
  const [formulario, setFormulario] = useState({ nome: "", email: "", telefone: "", descricao: "", website: "" });
  const [erros, setErros] = useState<ErrosValidacao>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState<string | null>(null);
  const [imagens, setImagens] = useState<File[]>([]);

  // Miniaturas das imagens escolhidas; as URLs temporárias são liberadas ao trocar a lista.
  const previas = useMemo(() => imagens.map((arquivo) => URL.createObjectURL(arquivo)), [imagens]);
  useEffect(() => () => previas.forEach((url) => URL.revokeObjectURL(url)), [previas]);

  function adicionarImagens(evento: React.ChangeEvent<HTMLInputElement>) {
    const novas = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    if (novas.length === 0) return;
    const lista = [...imagens, ...novas];
    const erro = validarImagensEncomenda(lista);
    setErros((atual) => {
      const { imagens: _, ...resto } = atual;
      return erro ? { ...resto, imagens: erro } : resto;
    });
    if (!erro) setImagens(lista);
  }

  function removerImagem(indice: number) {
    setImagens((atual) => atual.filter((_, i) => i !== indice));
    setErros(({ imagens: _, ...resto }) => resto);
  }

  function atualizar(campo: keyof typeof formulario, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const errosLocais = validarEncomenda(formulario);
    const erroImagens = validarImagensEncomenda(imagens);
    if (erroImagens) errosLocais.imagens = erroImagens;
    setErros(errosLocais);
    setErroGeral(null);
    if (Object.keys(errosLocais).length > 0) return;

    setEnviando(true);
    try {
      const dados = new FormData();
      Object.entries(formulario).forEach(([campo, valor]) => dados.append(campo, valor));
      imagens.forEach((arquivo) => dados.append("imagens", arquivo));

      const resposta = await fetch("/api/encomendas", { method: "POST", body: dados });

      if (resposta.ok) {
        setEmailEnviado(formulario.email.trim());
        return;
      }

      const corpo = (await resposta.json().catch(() => ({}))) as { erros?: ErrosValidacao; erro?: string };
      if (corpo.erros) {
        setErros(corpo.erros);
      } else if (resposta.status === 413) {
        setErroGeral("As imagens ficaram grandes demais para enviar juntas. Remova uma e tente de novo.");
      } else {
        setErroGeral(
          `${corpo.erro ?? "Não conseguimos enviar agora."} (erro ${resposta.status}). Tente de novo em instantes ou chame no WhatsApp.`
        );
      }
    } catch {
      setErroGeral("Sem conexão com o servidor. Confira sua internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (emailEnviado) {
    return (
      <div className={`${styles.cartao} ${styles.sucesso}`} role="status">
        <span className={styles.sucessoBadge}>encomenda recebida</span>
        <h2 className={styles.sucessoTitulo}>Recebemos a sua ideia!</h2>
        <p className={styles.sucessoTexto}>
          Enviamos uma confirmação para <strong>{emailEnviado}</strong>. Vamos analisar a sua ideia e
          retornaremos em breve, por e-mail ou WhatsApp.
        </p>
        <AvisoSpam />
        <Link href="/produtos" className={styles.sucessoLink}>
          Voltar para a vitrine
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.cartao} onSubmit={enviar} noValidate>
      <p className={styles.cartaoTitulo}>conta pra gente</p>

      <div className={checkoutStyles.campos}>
        <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
          <label className={checkoutStyles.rotulo} htmlFor="enc-nome">
            nome <span>*</span>
          </label>
          <input
            id="enc-nome"
            className={checkoutStyles.input}
            value={formulario.nome}
            onChange={(e) => atualizar("nome", e.target.value)}
            autoComplete="name"
            aria-invalid={Boolean(erros.nome)}
            aria-describedby={erros.nome ? "enc-nome-erro" : undefined}
          />
          {erros.nome && (
            <p id="enc-nome-erro" className={checkoutStyles.erroCampo}>
              {erros.nome}
            </p>
          )}
        </div>

        <div className={checkoutStyles.campo}>
          <label className={checkoutStyles.rotulo} htmlFor="enc-email">
            e-mail <span>*</span>
          </label>
          <input
            id="enc-email"
            type="email"
            className={checkoutStyles.input}
            value={formulario.email}
            onChange={(e) => atualizar("email", e.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(erros.email)}
            aria-describedby={erros.email ? "enc-email-erro" : undefined}
          />
          {erros.email && (
            <p id="enc-email-erro" className={checkoutStyles.erroCampo}>
              {erros.email}
            </p>
          )}
        </div>

        <div className={checkoutStyles.campo}>
          <label className={checkoutStyles.rotulo} htmlFor="enc-telefone">
            telefone / WhatsApp <span>*</span>
          </label>
          <input
            id="enc-telefone"
            type="tel"
            className={checkoutStyles.input}
            value={formulario.telefone}
            onChange={(e) => atualizar("telefone", e.target.value)}
            autoComplete="tel"
            placeholder="(19) 99999-8888"
            aria-invalid={Boolean(erros.telefone)}
            aria-describedby={erros.telefone ? "enc-telefone-erro" : undefined}
          />
          {erros.telefone && (
            <p id="enc-telefone-erro" className={checkoutStyles.erroCampo}>
              {erros.telefone}
            </p>
          )}
        </div>

        <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
          <label className={checkoutStyles.rotulo} htmlFor="enc-descricao">
            o que você quer encomendar? <span>*</span>
          </label>
          <textarea
            id="enc-descricao"
            className={`${checkoutStyles.input} ${styles.textarea}`}
            value={formulario.descricao}
            onChange={(e) => atualizar("descricao", e.target.value)}
            placeholder="Ex.: um chaveiro do meu gato, com uns 5 cm, em rosa e roxo."
            maxLength={DESCRICAO_TAMANHO_MAXIMO}
            aria-invalid={Boolean(erros.descricao)}
            aria-describedby={erros.descricao ? "enc-descricao-erro" : undefined}
          />
          <p className={`${checkoutStyles.statusCampo} ${styles.contador}`}>
            {formulario.descricao.length}/{DESCRICAO_TAMANHO_MAXIMO}
          </p>
          {erros.descricao && (
            <p id="enc-descricao-erro" className={checkoutStyles.erroCampo}>
              {erros.descricao}
            </p>
          )}
        </div>

        <div className={`${checkoutStyles.campo} ${checkoutStyles.campoLargo}`}>
          <span className={checkoutStyles.rotulo} id="enc-imagens-rotulo">
            imagens de referência (opcional)
          </span>
          <p className={checkoutStyles.statusCampo}>
            Fotos, desenhos ou a logo da sua empresa. Até {IMAGENS_QUANTIDADE_MAXIMA} imagens JPEG, PNG ou WebP, com 5MB cada.
          </p>

          {imagens.length > 0 && (
            <ul className={styles.imagens} aria-labelledby="enc-imagens-rotulo">
              {imagens.map((arquivo, indice) => (
                <li key={previas[indice]} className={styles.imagem}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:), sem otimização */}
                  <img src={previas[indice]} alt={arquivo.name} />
                  <button
                    type="button"
                    className={styles.imagemRemover}
                    onClick={() => removerImagem(indice)}
                    aria-label={`Remover ${arquivo.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {imagens.length < IMAGENS_QUANTIDADE_MAXIMA && (
            <label className={styles.imagensBotao}>
              <input
                type="file"
                accept={IMAGEM_TIPOS_ACEITOS.join(",")}
                multiple
                onChange={adicionarImagens}
                className={styles.imagensInput}
                aria-describedby={erros.imagens ? "enc-imagens-erro" : undefined}
              />
              {imagens.length === 0 ? "Adicionar imagens" : "Adicionar mais"}
            </label>
          )}

          {erros.imagens && (
            <p id="enc-imagens-erro" className={checkoutStyles.erroCampo}>
              {erros.imagens}
            </p>
          )}
        </div>
      </div>

      <div className={styles.armadilha} aria-hidden="true">
        <label htmlFor="enc-website">Não preencha este campo</label>
        <input
          id="enc-website"
          tabIndex={-1}
          autoComplete="off"
          value={formulario.website}
          onChange={(e) => atualizar("website", e.target.value)}
        />
      </div>

      {erroGeral && (
        <div className={checkoutStyles.erroGeral} role="alert">
          {erroGeral}
        </div>
      )}

      <button type="submit" className={checkoutStyles.submit} disabled={enviando}>
        {enviando ? "enviando…" : "Enviar minha encomenda"}
      </button>

      <p className={styles.whatsapp}>
        Prefere conversar? Chame no{" "}
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          WhatsApp {WHATSAPP_TEXTO}
        </a>
      </p>
    </form>
  );
}
