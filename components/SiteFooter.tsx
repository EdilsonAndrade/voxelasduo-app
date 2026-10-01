import Link from "next/link";
import { IconeInstagram, IconeWhatsapp } from "./IconesRedes";
import { INSTAGRAM_TEXTO, INSTAGRAM_URL, WHATSAPP_TEXTO, WHATSAPP_URL } from "@/lib/contato";
import styles from "./SiteFooter.module.css";

// Faixa de "voxels" no topo do rodapé: a sequência de cores se repete até preencher a largura.
const VOXELS = ["var(--roxo)", "var(--rosa)", "var(--laranja)", "var(--amarelo)", "var(--turquesa)"];

export default function SiteFooter() {
  const ano = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.voxels} aria-hidden="true">
        {Array.from({ length: 40 }, (_, i) => (
          <span key={i} style={{ background: VOXELS[i % VOXELS.length] }} />
        ))}
      </div>

      <div className={`container ${styles.grade}`}>
        <div className={styles.marca}>
          <p className={styles.nome}>Voxelas Duo</p>
          <p className={styles.lema}>ideias que ganham forma</p>
        </div>

        <nav className={styles.coluna} aria-label="Rodapé">
          <h2 className={styles.titulo}>Navegue</h2>
          <Link href="/produtos">Produtos</Link>
          <Link href="/encomendas">Encomendas</Link>
        </nav>

        <div className={styles.coluna}>
          <h2 className={styles.titulo}>Fale com a gente</h2>
          <a href={WHATSAPP_URL} className={styles.canal} target="_blank" rel="noopener noreferrer">
            <span className={`${styles.icone} ${styles.iconeWhatsapp}`}>
              <IconeWhatsapp />
            </span>
            <span>
              <span className={styles.canalNome}>WhatsApp</span>
              {WHATSAPP_TEXTO}
            </span>
          </a>
          <a href={INSTAGRAM_URL} className={styles.canal} target="_blank" rel="noopener noreferrer">
            <span className={`${styles.icone} ${styles.iconeInstagram}`}>
              <IconeInstagram />
            </span>
            <span>
              <span className={styles.canalNome}>Instagram</span>
              {INSTAGRAM_TEXTO}
            </span>
          </a>
        </div>
      </div>

      <div className={`container ${styles.base}`}>
        © {ano} Voxelas Duo · Produtos impressos em 3D
      </div>
    </footer>
  );
}
