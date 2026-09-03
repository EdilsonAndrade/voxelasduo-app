import styles from "./produtos.module.css";

/** Título com cada palavra em uma cor da paleta, ecoando o logo da marca. */
export default function RainbowTitle({ texto }: { texto: string }) {
  const palavras = texto.split(" ");
  return (
    <h1 className={styles.rainbow}>
      {palavras.map((palavra, i) => (
        <span key={i}>{palavra}{i < palavras.length - 1 ? " " : ""}</span>
      ))}
    </h1>
  );
}
