"use client";

import { useState } from "react";
import BannerSecao from "@/components/home/BannerSecao";
import TextoDestaqueSecao from "@/components/home/TextoDestaqueSecao";
import homeStyles from "@/components/home/home.module.css";
import type { DadosSecaoHome } from "@/lib/home/validation";
import styles from "./secoesHome.module.css";

/** Pré-visualização do formulário, usando os mesmos componentes da home (FR-008). */
export default function SecaoHomePreview({ dados }: { dados: DadosSecaoHome }) {
  const [mobile, setMobile] = useState(false);
  const ehBanner = dados.tipo === "bannerHero" || dados.tipo === "bannerIntermediario";

  let conteudo: React.ReactNode;
  if (ehBanner && dados.imagemDesktop) {
    conteudo = (
      <BannerSecao
        tipo={dados.tipo as "bannerHero" | "bannerIntermediario"}
        imagemDesktop={dados.imagemDesktop}
        imagemMobile={dados.imagemMobile}
        titulo={dados.titulo}
        subtitulo={dados.subtitulo}
        texto={dados.texto}
        botao={dados.botao?.texto && dados.botao.link ? dados.botao : undefined}
        alinhamentoHorizontal={dados.alinhamentoHorizontal}
        alinhamentoVertical={dados.alinhamentoVertical}
        modoMobile={mobile}
      />
    );
  } else if (dados.tipo === "textoDestaque" && dados.titulo) {
    conteudo = (
      <TextoDestaqueSecao
        titulo={dados.titulo}
        texto={dados.texto}
        botao={dados.botao?.texto && dados.botao.link ? dados.botao : undefined}
      />
    );
  } else if (dados.tipo === "carrossel") {
    conteudo = (
      <p className={styles.previewVazio}>
        O carrossel mostra os produtos marcados para ele na lista de Produtos (coluna Destaques).
      </p>
    );
  } else {
    conteudo = (
      <p className={styles.previewVazio}>
        {ehBanner ? "Envie a imagem para ver como o banner fica." : "Preencha o título para ver a prévia."}
      </p>
    );
  }

  return (
    <div className={styles.previewCaixa}>
      <div className={styles.previewTopo}>
        <span>Pré-visualização</span>
        {dados.tipo !== "carrossel" && (
          <div className={styles.alternador} role="group" aria-label="Tamanho da tela">
            <button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>
              Computador
            </button>
            <button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>
              Celular
            </button>
          </div>
        )}
      </div>
      <div className={`${styles.previewPalco} ${mobile ? styles.previewMobile : ""}`}>
        <div className={homeStyles.home} style={{ padding: 0 }}>
          {conteudo}
        </div>
      </div>
    </div>
  );
}
