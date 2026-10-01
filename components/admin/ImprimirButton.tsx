"use client";

/** Abre a impressão do navegador — "Salvar como PDF" gera o arquivo (EDI-126). */
export default function ImprimirButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      Imprimir / salvar PDF
    </button>
  );
}
