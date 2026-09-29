import type { ReactNode } from "react";
import VoxelsErro from "./VoxelsErro";
import styles from "./PaginaErro.module.css";

/**
 * Layout das telas de erro (500) e página não encontrada (404) — EDI-113.
 * Sem hooks: serve tanto para `error.tsx`/`global-error.tsx` (client) quanto
 * para `not-found.tsx` (server).
 */
export default function PaginaErro({
  variante,
  nota,
  titulo,
  texto,
  acoes,
  codigo,
}: {
  variante: "falha" | "vazio";
  /** Anotação manuscrita ao lado da ilustração. */
  nota: string;
  titulo: string;
  texto: string;
  acoes: ReactNode;
  /** Código do erro (digest do servidor) — ausente = linha não aparece. */
  codigo?: string;
}) {
  return (
    <main className={styles.pagina}>
      <div className={styles.conteudo}>
        <figure className={styles.ilustracao}>
          <VoxelsErro variante={variante} />
          <figcaption className={styles.nota}>{nota}</figcaption>
        </figure>

        <div className={styles.texto}>
          <h1 className={styles.titulo}>{titulo}</h1>
          <p className={styles.descricao}>{texto}</p>
          <div className={styles.acoes}>{acoes}</div>
          {codigo && (
            <p className={styles.codigo}>
              Código do erro: <span className={styles.codigoValor}>{codigo}</span>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export { styles as estilosPaginaErro };
