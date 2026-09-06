"use client";

import { useEffect } from "react";
import styles from "./Toast.module.css";

export default function Toast({
  mensagem,
  aoFechar,
  duracaoMs = 4000,
}: {
  mensagem: string | null;
  aoFechar: () => void;
  duracaoMs?: number;
}) {
  useEffect(() => {
    if (!mensagem) return;
    const temporizador = setTimeout(aoFechar, duracaoMs);
    return () => clearTimeout(temporizador);
  }, [mensagem, duracaoMs, aoFechar]);

  if (!mensagem) return null;

  return (
    <div className={styles.toast} role="status">
      <span className={styles.icone} aria-hidden="true">
        ✓
      </span>
      {mensagem}
    </div>
  );
}
