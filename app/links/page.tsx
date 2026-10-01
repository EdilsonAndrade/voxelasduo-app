import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IconeInstagram, IconeSite, IconeWhatsapp } from "@/components/IconesRedes";
import { INSTAGRAM_TEXTO, INSTAGRAM_URL, WHATSAPP_TEXTO, WHATSAPP_URL } from "@/lib/contato";
import styles from "./links.module.css";

export const metadata: Metadata = {
  title: "Nossos canais — Voxelas Duo",
  description: "WhatsApp, Instagram e site da Voxelas Duo em um só lugar.",
};

/** Aresta do cubo isométrico no viewBox (120×120). */
const ARESTA = 24;

function Cubo({ x, y, cor }: { x: number; y: number; cor: string }) {
  const s = ARESTA;
  return (
    <g style={{ fill: cor }}>
      <polygon points={`${x},${y} ${x + s},${y + s / 2} ${x},${y + s} ${x - s},${y + s / 2}`} />
      <polygon points={`${x - s},${y + s / 2} ${x},${y + s} ${x},${y + 2 * s} ${x - s},${y + 1.5 * s}`} />
      <polygon
        points={`${x - s},${y + s / 2} ${x},${y + s} ${x},${y + 2 * s} ${x - s},${y + 1.5 * s}`}
        className={styles.sombraClara}
      />
      <polygon points={`${x},${y + s} ${x + s},${y + s / 2} ${x + s},${y + 1.5 * s} ${x},${y + 2 * s}`} />
      <polygon
        points={`${x},${y + s} ${x + s},${y + s / 2} ${x + s},${y + 1.5 * s} ${x},${y + 2 * s}`}
        className={styles.sombraEscura}
      />
    </g>
  );
}

type Canal = {
  nome: string;
  contato: string;
  href: string;
  externo: boolean;
  cor: string;
  icone: ReactNode;
};

// A ordem dos cartões segue a pilha de cubos do topo (de cima para baixo).
const CANAIS: Canal[] = [
  {
    nome: "WhatsApp",
    contato: WHATSAPP_TEXTO,
    href: WHATSAPP_URL,
    externo: true,
    cor: "var(--turquesa)",
    icone: <IconeWhatsapp />,
  },
  {
    nome: "Instagram",
    contato: INSTAGRAM_TEXTO,
    href: INSTAGRAM_URL,
    externo: true,
    cor: "var(--rosa)",
    icone: <IconeInstagram />,
  },
  {
    nome: "Site",
    contato: "www.voxelasduo.com.br",
    href: "/",
    externo: false,
    cor: "var(--laranja)",
    icone: <IconeSite />,
  },
];

/** Página de canais (link do QR code do banner de eventos). */
export default function LinksPage() {
  return (
    <main className={styles.pagina}>
      <div className={styles.conteudo}>
        <header className={styles.topo}>
          <figure className={styles.pilha}>
            <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
              <ellipse cx="60" cy="112" rx="34" ry="5" className={styles.mesa} />
              <Cubo x={60} y={60} cor={CANAIS[2].cor} />
              <Cubo x={60} y={36} cor={CANAIS[1].cor} />
              <Cubo x={60} y={12} cor={CANAIS[0].cor} />
            </svg>
            <figcaption className={styles.nota}>que bom te ver por aqui!</figcaption>
          </figure>
          <h1 className={styles.titulo}>Voxelas Duo</h1>
          <p className={styles.subtitulo}>Produtos impressos em 3D. Escolha por onde falar com a gente.</p>
        </header>

        <section className={styles.destaque} aria-labelledby="destaque-titulo">
          <p className={styles.destaqueNota}>também fazemos</p>
          <h2 id="destaque-titulo" className={styles.destaqueTitulo}>
            Peças personalizadas para a sua empresa ou para você
          </h2>
          <p className={styles.destaqueTexto}>
            Brindes com a marca do seu negócio, um presente com o nome de quem você gosta ou aquela ideia que ainda
            não existe à venda. Conte o que imaginou e a gente responde com o orçamento.
          </p>
          <Link href="/encomendas" className={styles.destaqueBotao}>
            Fazer uma encomenda
          </Link>
        </section>

        <ul className={styles.lista}>
          {CANAIS.map((canal) => {
            const conteudo = (
              <>
                <span className={styles.icone} style={{ background: canal.cor }}>
                  {canal.icone}
                </span>
                <span className={styles.nome}>{canal.nome}</span>
                <span className={styles.contato}>{canal.contato}</span>
              </>
            );
            return (
              <li key={canal.nome}>
                {canal.externo ? (
                  <a href={canal.href} className={styles.cartao} target="_blank" rel="noopener noreferrer">
                    {conteudo}
                  </a>
                ) : (
                  <Link href={canal.href} className={styles.cartao}>
                    {conteudo}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
