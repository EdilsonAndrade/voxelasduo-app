"use client";

import { useState, type ReactNode } from "react";
import calc from "../calculadoraRapida.module.css";

export type IconeSecao = "modelo" | "impressao" | "extras" | "preco" | "canal" | "ads" | "concorrente" | "producao";

/** Traços simples (24×24, stroke) — um por seção. */
const ICONES: Record<IconeSecao, ReactNode> = {
  modelo: <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm0 0v18m8-13.5-8 4.5-8-4.5" />,
  impressao: <path d="M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z" />,
  extras: <path d="M3 8 12 3l9 5-9 5-9-5Zm0 0v8l9 5 9-5V8" />,
  preco: <path d="M12 3v18M16.5 7.5c-.8-1.2-2.4-2-4.5-2-2.8 0-4.5 1.4-4.5 3.2 0 4.3 9 2.4 9 6.6 0 1.8-1.8 3.2-4.5 3.2-2.2 0-3.9-.9-4.7-2.2" />,
  canal: <path d="M4 9h16l-1.5-5h-13L4 9Zm0 0v11h16V9M9 20v-6h6v6" />,
  ads: <path d="M4 10v4h3l6 4V6l-6 4H4Zm13-1a4 4 0 0 1 0 6" />,
  concorrente: <path d="M4 20V10m6 10V4m6 16v-7m6 7H2" />,
  producao: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
};

/** Seção recolhível da calculadora: ícone na cor da seção, título e um resumo do que foi preenchido. */
export default function Secao({
  icone,
  titulo,
  resumo,
  aberta,
  children,
}: {
  icone: IconeSecao;
  titulo: string;
  resumo?: ReactNode;
  aberta?: boolean;
  children: ReactNode;
}) {
  // Só define se começa aberta; depois quem abre e fecha é o usuário.
  const [abertaNoInicio] = useState(aberta);
  return (
    <details className={calc.secao} data-icone={icone} open={abertaNoInicio}>
      <summary className={calc.secaoTopo}>
        <span className={calc.secaoIcone} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {ICONES[icone]}
          </svg>
        </span>
        <h2>{titulo}</h2>
        {resumo && <span className={calc.secaoResumo}>{resumo}</span>}
        <span className={calc.secaoSeta} aria-hidden="true" />
      </summary>
      <div className={calc.secaoCorpo}>{children}</div>
    </details>
  );
}
