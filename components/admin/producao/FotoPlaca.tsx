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
 */
export default function FotoPlaca({
  url,
  nome,
  className,
}: {
  url?: string;
  nome: string;
  className: string;
}) {
  const [ampliada, setAmpliada] = useState(false);

  useEffect(() => {
    if (!ampliada) return;

    const fechar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAmpliada(false);
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [ampliada]);

  if (!url) {
    return <span className={className} aria-hidden="true" />;
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
        <img className={className} src={url} alt={`Placa de ${nome}`} loading="lazy" />
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
