"use client";

import { useEffect, useState } from "react";
import styles from "./baixarFotos.module.css";

/** URL da foto com o parâmetro que faz o Blob responder como anexo. */
function urlDeDownload(foto: string): string {
  return `${foto}${foto.includes("?") ? "&" : "?"}download=1`;
}

/**
 * Botão da lista do admin que abre as fotos do produto em miniaturas grandes
 * para escolher qual baixar (para postar nas redes). Cada miniatura é um link
 * de download: dá para baixar várias sem fechar a janela.
 */
export default function BaixarFotosProduto({ produtoNome, fotos }: { produtoNome: string; fotos: string[] }) {
  const [aberto, setAberto] = useState(false);
  const [baixadas, setBaixadas] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  if (fotos.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className={styles.gatilho}
        onClick={() => setAberto(true)}
        title={`Baixar fotos de ${produtoNome}`}
        aria-label={`Baixar fotos de ${produtoNome} (${fotos.length})`}
      >
        <span aria-hidden="true">⬇</span>
        <span className={styles.contagem}>{fotos.length}</span>
      </button>

      {aberto && (
        <div className={styles.overlay} onClick={() => setAberto(false)}>
          <div
            className={styles.card}
            role="dialog"
            aria-modal="true"
            aria-label={`Fotos de ${produtoNome}`}
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className={styles.topo}>
              <div>
                <h2 className={styles.titulo}>{produtoNome}</h2>
                <p className={styles.ajuda}>
                  Clique na foto que você quer baixar. Dá para baixar mais de uma antes de fechar.
                </p>
              </div>
              <button type="button" className={styles.btnFechar} onClick={() => setAberto(false)}>
                Fechar
              </button>
            </div>

            <div className={styles.grade}>
              {fotos.map((foto, indice) => (
                <a
                  key={foto}
                  href={urlDeDownload(foto)}
                  download
                  className={`${styles.item} ${baixadas.has(indice) ? styles.itemBaixado : ""}`}
                  onClick={() => setBaixadas((atual) => new Set(atual).add(indice))}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto} alt={`${produtoNome} — foto ${indice + 1}`} loading="lazy" />
                  <span className={styles.rodape}>
                    <span className={styles.ordem}>
                      {indice + 1}
                      {indice === 0 ? " · capa" : ""}
                    </span>
                    <span className={styles.acao}>{baixadas.has(indice) ? "Baixada ✓" : "Baixar"}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
