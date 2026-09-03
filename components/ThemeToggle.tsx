"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "voxelas-theme";

export default function ThemeToggle() {
  const [tema, setTema] = useState<"light" | "dark">("light");

  useEffect(() => {
    const atual = document.documentElement.getAttribute("data-theme");
    setTema(atual === "dark" ? "dark" : "light");
  }, []);

  function alternar() {
    const proximo = tema === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", proximo);
    window.localStorage.setItem(STORAGE_KEY, proximo);
    setTema(proximo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Alternar tema claro/escuro"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        border: "2px solid var(--surface-line)",
        background: "var(--surface)",
        borderRadius: "999px",
        padding: "0.4rem 0.85rem",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        fontSize: "0.8rem",
        color: "var(--preto)",
      }}
    >
      {tema === "dark" ? "🌙" : "☀️"} {tema === "dark" ? "escuro" : "claro"}
    </button>
  );
}
