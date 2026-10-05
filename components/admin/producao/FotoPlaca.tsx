"use client";

import { useEffect, useState } from "react";
import styles from "./producao.module.css";

/**
 * Miniatura da placa que amplia na própria página (EDI-127).
 *
 * Não é um link para a imagem: o CDN do fabricante serve o arquivo como
 * anexo, então abrir a URL numa aba baixaria o arquivo em vez de mostrá-lo.
 * Ampliar aqui resolve o que o usuário quer — ver a peça para reconhecê-la —
 * sem download e sem sair da tela.
 *
 * A URL da origem é assinada e vale 30 minutos. Quando ela expira antes de a
 * cópia para o nosso storage acontecer, o navegador mostraria o ícone de
 * imagem quebrada com o alt por cima; aqui a falha vira o mesmo espaço vazio
 * de quem não tem foto, com o motivo no title.
 */
export default function FotoPlaca({
  url,
  nome,
  className,
  classNameVazio,
}: {
  url?: string;
  nome: string;
  className: string;
  /** Espaço reservado quando não há foto — ou quando a da origem já expirou. */
  classNameVazio: string;
}) {
  const [ampliada, setAmpliada] = useState(false);
  const [falhou, setFalhou] = useState(false);

  // Nova importação traz uma URL assinada nova: a falha anterior não vale mais.
  useEffect(() => {
    setFalhou(false);
  }, [url]);

  useEffect(() => {
    if (!ampliada) return;

    const fechar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAmpliada(false);
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [ampliada]);

  if (!url) {
    return <span className={classNameVazio} aria-hidden="true" />;
  }

  if (falhou) {
    return (
      <span
        className={classNameVazio}
        title="A miniatura da origem expirou (link vale 30 min). Importe de novo para copiá-la."
      />
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.botaoFoto}
        onClick={() => setAmpliada(true)}
        title="Ver a placa maior"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={className}
          src={url}
          alt={`Placa de ${nome}`}
          loading="lazy"
          onError={() => setFalhou(true)}
        />
      </button>

      {ampliada && (
        <div
          className={styles.sobreposicao}
          role="dialog"
          aria-modal="true"
          aria-label={`Placa de ${nome}`}
          onClick={() => setAmpliada(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.fotoAmpliada} src={url} alt={`Placa de ${nome}`} />
          <p className={styles.legendaAmpliada}>{nome}</p>
          <button type="button" className={styles.fecharFoto} onClick={() => setAmpliada(false)}>
            Fechar
          </button>
        </div>
      )}
    </>
  );
}
