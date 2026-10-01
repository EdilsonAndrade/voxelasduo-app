import Link from "next/link";
import {
  COR_TEXTO_BANNER_PADRAO,
  CORES_TEXTO_ESCURAS,
  HEX_COR_TEXTO_BANNER,
  type AlinhamentoHorizontal,
  type AlinhamentoVertical,
  type BotaoSecao,
  type CorTextoBanner,
  type SecaoBanner,
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
  corSubtitulo?: CorTextoBanner;
  corTitulo?: CorTextoBanner;
  corTexto?: CorTextoBanner;
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
  corSubtitulo = COR_TEXTO_BANNER_PADRAO.corSubtitulo,
  corTitulo = COR_TEXTO_BANNER_PADRAO.corTitulo,
  corTexto = COR_TEXTO_BANNER_PADRAO.corTexto,
  modoMobile = false,
}: BannerSecaoProps) {
  const temTexto = Boolean(titulo || subtitulo || texto || botao);
  const TituloTag = tipo === "bannerHero" ? "h1" : "h2";
  const externo = botao?.link.startsWith("https://");
  // O véu acompanha a cor do texto principal: texto escuro ganha véu claro.
  const corPrincipal = titulo ? corTitulo : texto ? corTexto : corSubtitulo;
  const veuClaro = CORES_TEXTO_ESCURAS.includes(corPrincipal);

  const classes = [
    styles.banner,
    tipo === "bannerHero" ? styles.bannerHero : styles.bannerIntermediario,
    temTexto ? classeVeu(alinhamentoHorizontal, alinhamentoVertical) : "",
    temTexto && veuClaro ? styles.veuClaro : "",
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
          {subtitulo && <p className={styles.bannerSubtitulo} style={{ color: HEX_COR_TEXTO_BANNER[corSubtitulo] }}>
              {subtitulo}
            </p>}
          {titulo && (
            <TituloTag className={styles.bannerTitulo} style={{ color: HEX_COR_TEXTO_BANNER[corTitulo] }}>
              {titulo}
            </TituloTag>
          )}
          {texto && (
            <p className={styles.bannerTexto} style={{ color: HEX_COR_TEXTO_BANNER[corTexto] }}>
              {texto}
            </p>
          )}
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
