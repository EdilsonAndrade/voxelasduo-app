import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
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

function IconeWhatsapp() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </svg>
  );
}

function IconeInstagram() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconeSite() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z" />
    </svg>
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
    contato: "(19) 98342-3586",
    href: "https://wa.me/5519983423586",
    externo: true,
    cor: "var(--turquesa)",
    icone: <IconeWhatsapp />,
  },
  {
    nome: "Instagram",
    contato: "@voxelasduo",
    href: "https://www.instagram.com/voxelasduo",
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
