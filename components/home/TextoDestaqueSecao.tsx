import Link from "next/link";
import type { BotaoSecao } from "@/lib/models/secaoHome";
import styles from "./home.module.css";

export interface TextoDestaqueSecaoProps {
  titulo: string;
  texto?: string;
  botao?: BotaoSecao;
}

/** Faixa só com texto — cada palavra do título numa cor da marca, como o logo. */
export default function TextoDestaqueSecao({ titulo, texto, botao }: TextoDestaqueSecaoProps) {
  const palavras = titulo.split(" ");
  const externo = botao?.link.startsWith("https://");

  return (
    <section className={styles.destaque}>
      <h2 className={styles.destaqueTitulo}>
        {palavras.map((palavra, i) => (
          <span key={i}>
            {palavra}
            {i < palavras.length - 1 ? " " : ""}
          </span>
        ))}
      </h2>
      {texto && <p className={styles.destaqueTexto}>{texto}</p>}
      {botao &&
        (externo ? (
          <a href={botao.link} className={styles.botao} target="_blank" rel="noopener noreferrer">
            {botao.texto}
          </a>
        ) : (
          <Link href={botao.link} className={styles.botao}>
            {botao.texto}
          </Link>
        ))}
    </section>
  );
}
