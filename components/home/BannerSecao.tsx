import Link from "next/link";
import type {
  AlinhamentoHorizontal,
  AlinhamentoVertical,
  BotaoSecao,
  SecaoBanner,
} from "@/lib/models/secaoHome";
import styles from "./home.module.css";

export interface BannerSecaoProps {
  tipo: SecaoBanner["tipo"];
  imagemDesktop: string;
  imagemMobile?: string;
  titulo?: string;
  subtitulo?: string;
  texto?: string;
  botao?: BotaoSecao;
  alinhamentoHorizontal?: AlinhamentoHorizontal;
  alinhamentoVertical?: AlinhamentoVertical;
  /** Pré-visualização no admin: aplica o layout de celular e usa a imagem mobile. */
  modoMobile?: boolean;
}

const CLASSE_H: Record<AlinhamentoHorizontal, string> = {
  esquerda: styles.hEsquerda,
  centro: styles.hCentro,
  direita: styles.hDireita,
};
const CLASSE_V: Record<AlinhamentoVertical, string> = {
  topo: styles.vTopo,
  meio: styles.vMeio,
  base: styles.vBase,
};
/** Véu escurece o lado do texto; texto embaixo/em cima usa o véu vertical padrão. */
function classeVeu(h: AlinhamentoHorizontal, v: AlinhamentoVertical): string {
  if (h === "centro") return v === "meio" ? styles.veuCentro : "";
  return h === "esquerda" ? styles.veuEsquerda : styles.veuDireita;
}

export default function BannerSecao({
  tipo,
  imagemDesktop,
  imagemMobile,
  titulo,
  subtitulo,
  texto,
  botao,
  alinhamentoHorizontal = "esquerda",
  alinhamentoVertical = "base",
  modoMobile = false,
}: BannerSecaoProps) {
  const temTexto = Boolean(titulo || subtitulo || texto || botao);
  const TituloTag = tipo === "bannerHero" ? "h1" : "h2";
  const externo = botao?.link.startsWith("https://");

  const classes = [
    styles.banner,
    tipo === "bannerHero" ? styles.bannerHero : styles.bannerIntermediario,
    temTexto ? classeVeu(alinhamentoHorizontal, alinhamentoVertical) : "",
    modoMobile ? styles.modoMobile : "",
  ].join(" ");

  return (
    <section className={classes} aria-label={titulo ?? "Destaque"}>
      <picture className={styles.bannerImagem}>
        {imagemMobile && !modoMobile && <source media="(max-width: 767px)" srcSet={imagemMobile} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={modoMobile ? (imagemMobile ?? imagemDesktop) : imagemDesktop}
          alt={temTexto ? "" : (titulo ?? "Banner")}
          fetchPriority={tipo === "bannerHero" ? "high" : "auto"}
          loading={tipo === "bannerHero" ? "eager" : "lazy"}
        />
      </picture>

      {temTexto && (
        <div
          className={`${styles.bannerConteudo} ${CLASSE_H[alinhamentoHorizontal]} ${CLASSE_V[alinhamentoVertical]}`}
        >
          {subtitulo && <p className={styles.bannerSubtitulo}>{subtitulo}</p>}
          {titulo && <TituloTag className={styles.bannerTitulo}>{titulo}</TituloTag>}
          {texto && <p className={styles.bannerTexto}>{texto}</p>}
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
        </div>
      )}
    </section>
  );
}
