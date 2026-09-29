"use client";

import { useEffect } from "react";
import PaginaErro, { estilosPaginaErro as styles } from "@/components/erro/PaginaErro";
import "./globals.css";

/**
 * Falha no próprio layout raiz (EDI-113): substitui o documento inteiro, então
 * define `<html>`/`<body>`, fontes e tema claro por conta própria.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR" data-theme="light">
      <head>
        <title>Erro — Voxelas Duo</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@400;700;800&family=Caveat:wght@500;700&display=swap"
        />
      </head>
      <body>
        <PaginaErro
          variante="falha"
          nota="camada deslocada!"
          titulo="Não foi possível carregar o site"
          texto="Houve uma falha no nosso servidor. Tente de novo em alguns segundos. Se continuar, fale com a gente e informe o código abaixo."
          codigo={error.digest}
          acoes={
            <>
              <button type="button" className={styles.botaoPrincipal} onClick={() => retry()}>
                Tentar de novo
              </button>
              {/* <a> e não <Link>: o layout quebrou, então recarrega o documento inteiro. */}
              <a href="/" className={styles.botaoSecundario}>
                Página inicial
              </a>
            </>
          }
        />
      </body>
    </html>
  );
}
