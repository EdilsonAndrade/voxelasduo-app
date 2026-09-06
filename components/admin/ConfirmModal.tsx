"use client";

import { useEffect, useRef } from "react";
import styles from "./ConfirmModal.module.css";

export default function ConfirmModal({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  variante = "padrao",
  onConfirmar,
  onCancelar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: "padrao" | "perigo";
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const confirmarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    confirmarRef.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  return (
    <div className={styles.overlay} onClick={onCancelar}>
      <div
        className={styles.card}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmModalTitulo"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id="confirmModalTitulo" className={styles.titulo}>
          {titulo}
        </h2>
        <p className={styles.mensagem}>{mensagem}</p>
        <div className={styles.acoes}>
          <button type="button" className={styles.btnCancelar} onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button
            type="button"
            ref={confirmarRef}
            className={variante === "perigo" ? styles.btnPerigo : styles.btnConfirmar}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
