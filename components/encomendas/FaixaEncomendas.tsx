import Image from "next/image";
import Link from "next/link";
import styles from "./encomendas.module.css";

/** Faixa da vitrine que leva à página /encomendas. */
export default function FaixaEncomendas() {
  return (
    <section className={`${styles.palco} ${styles.faixa}`} aria-labelledby="faixa-encomendas-titulo">
      <div className={styles.faixaTexto}>
        <p className={styles.faixaEyebrow}>sonhe, imagine, imprima</p>
        <h2 id="faixa-encomendas-titulo" className={styles.faixaTitulo}>
          Também fazemos <span>encomendas de impressão 3D</span>
        </h2>
        <p className={styles.faixaDescricao}>
          Não encontrou o que procurava? Conte sua ideia e a gente analisa: decoração,
          colecionáveis, presentes e peças personalizadas.
        </p>
        <Link href="/encomendas" className={styles.faixaBotao}>
          Fazer minha encomenda →
        </Link>
      </div>
      <Image
        src="/images/encomendas.png"
        alt=""
        width={1254}
        height={1254}
        sizes="190px"
        className={styles.faixaMiniatura}
      />
    </section>
  );
}
