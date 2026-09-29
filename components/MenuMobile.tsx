"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./SiteHeader.module.css";

/**
 * Menu do celular: botão hambúrguer + painel lateral. Os links vêm do
 * SiteHeader (server) já prontos, para não duplicar a regra de sessão aqui.
 */
export default function MenuMobile({
  principal,
  admin,
}: {
  principal: React.ReactNode;
  admin: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  // Fecha ao navegar para outra página.
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  useEffect(() => {
    if (!aberto) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        className={styles.hamburguer}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={aberto}
        aria-controls="menu-mobile"
        onClick={() => setAberto((a) => !a)}
      >
        <span className={styles.hamburguerLinhas} data-aberto={aberto} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <div className={styles.menuVeu} data-aberto={aberto} onClick={() => setAberto(false)} aria-hidden="true" />

      <nav
        id="menu-mobile"
        className={styles.menuPainel}
        data-aberto={aberto}
        aria-label="Menu"
        inert={!aberto}
        // Clicar em qualquer link fecha o painel (mesmo se for a página atual).
        onClick={(evento) => {
          if ((evento.target as HTMLElement).closest("a")) setAberto(false);
        }}
      >
        <div className={styles.menuTopo}>
          <span className={styles.menuTitulo}>Menu</span>
          <button type="button" className={styles.menuFechar} onClick={() => setAberto(false)} aria-label="Fechar menu">
            ×
          </button>
        </div>
        <div className={styles.menuLinks}>{principal}</div>
        <div className={styles.menuAdmin}>{admin}</div>
      </nav>
    </>
  );
}
