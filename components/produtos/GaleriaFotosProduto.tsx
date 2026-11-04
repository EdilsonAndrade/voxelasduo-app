"use client";

import { useState } from "react";
import styles from "./produtos.module.css";
import ImagemOtimizada from "@/components/ImagemOtimizada";

interface GaleriaFotosProdutoProps {
  fotos: string[];
  nome: string;
}

export default function GaleriaFotosProduto({ fotos, nome }: GaleriaFotosProdutoProps) {
  const [fotoAtiva, setFotoAtiva] = useState(0);

  return (
    <div>
      <div className={styles.galleryMain}>
        <ImagemOtimizada sizes="(max-width: 900px) 100vw, 600px" src={fotos[fotoAtiva]} alt={nome} />
      </div>
      {fotos.length > 1 && (
        <div className={styles.thumbs}>
          {fotos.map((foto, indice) => (
            <button
              type="button"
              key={foto}
              className={indice === fotoAtiva ? styles.thumbAtivo : styles.thumb}
              onClick={() => setFotoAtiva(indice)}
              aria-label={`Ver foto ${indice + 1} de ${nome}`}
              aria-current={indice === fotoAtiva}
            >
              <ImagemOtimizada sizes="96px" src={foto} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
