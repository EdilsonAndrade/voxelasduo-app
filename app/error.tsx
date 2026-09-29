"use client";

import Link from "next/link";
import { useEffect } from "react";
import PaginaErro, { estilosPaginaErro as styles } from "@/components/erro/PaginaErro";

/**
 * Erro inesperado numa página (EDI-113). O status HTTP continua sendo de
 * erro e o servidor registra o log com o mesmo `digest` exibido ao visitante.
 */
export default function Error({
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
    <PaginaErro
      variante="falha"
      nota="camada deslocada!"
      titulo="Não foi possível carregar esta página"
      texto="Houve uma falha no nosso servidor. Tente de novo em alguns segundos. Se continuar, fale com a gente e informe o código abaixo."
      codigo={error.digest}
      acoes={
        <>
          <button type="button" className={styles.botaoPrincipal} onClick={() => retry()}>
            Tentar de novo
          </button>
          <Link href="/produtos" className={styles.botaoSecundario}>
            Ver produtos
          </Link>
        </>
      }
    />
  );
}
