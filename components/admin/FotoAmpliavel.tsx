"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";
import ImagemOtimizada from "@/components/ImagemOtimizada";

/**
 * Miniatura que amplia na própria página ao clicar — mesmo comportamento de
 * `producao/FotoPlaca.tsx`, para reconhecer o produto sem sair da tela.
 * Sem foto (ou com a URL quebrada) vira um espaço tracejado do mesmo tamanho.
 */
export default function FotoAmpliavel({ url, nome }: { url?: string; nome: string }) {
  const [ampliada, setAmpliada] = useState(false);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => setFalhou(false), [url]);

  useEffect(() => {
    if (!ampliada) return;

    const fechar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAmpliada(false);
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [ampliada]);

  if (!url || falhou) {
    return <span className={styles.miniaturaVazia} title={`${nome} — sem foto`} />;
  }

  return (
    <>
      <button
        type="button"
        className={styles.miniaturaBotao}
        onClick={() => setAmpliada(true)}
        title={`Ampliar foto de ${nome}`}
      >
        <ImagemOtimizada sizes="96px"
          className={styles.miniatura}
          src={url}
          alt={nome}
          loading="lazy"
          onError={() => setFalhou(true)}
        />
      </button>

      {ampliada && (
        <div
          className={styles.fotoSobreposicao}
          role="dialog"
          aria-modal="true"
          aria-label={nome}
          onClick={() => setAmpliada(false)}
        >
          <ImagemOtimizada sizes="100vw" className={styles.fotoAmpliada} src={url} alt={nome} />
          <p className={styles.fotoLegenda}>{nome}</p>
          <button type="button" className={styles.fotoFechar} onClick={() => setAmpliada(false)}>
            Fechar
          </button>
        </div>
      )}
    </>
  );
}
