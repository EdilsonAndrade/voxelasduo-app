import { redirect } from "next/navigation";
import BannerSecao from "@/components/home/BannerSecao";
import CarrosselProdutos from "@/components/home/CarrosselProdutos";
import TextoDestaqueSecao from "@/components/home/TextoDestaqueSecao";
import { secoesPublicas } from "@/lib/home/secoesPublicas";
import styles from "@/components/home/home.module.css";

// Página estática revalidada sob demanda (`revalidatePath("/")` nas rotas do
// admin de banners); os 60s cobrem mudanças indiretas, como estoque e preço
// dos produtos dos carrosséis (EDI-114, research.md #3).
export const revalidate = 60;

/**
 * Home montada no admin (/admin/banners). Sem nenhuma seção ativa, mantém o
 * comportamento anterior: o comprador vai direto para o catálogo.
 */
export default async function Home() {
  const secoes = await secoesPublicas();

  if (secoes.length === 0) {
    redirect("/produtos");
  }

  return (
    <div className={`container ${styles.home}`}>
      {secoes.map((item) => {
        switch (item.tipo) {
          case "bannerHero":
          case "bannerIntermediario": {
            const { secao } = item;
            return (
              <BannerSecao
                key={item.id}
                tipo={secao.tipo}
                imagemDesktop={secao.imagemDesktop}
                imagemMobile={secao.imagemMobile}
                titulo={secao.titulo}
                subtitulo={secao.subtitulo}
                texto={secao.texto}
                botao={secao.botao}
                alinhamentoHorizontal={secao.alinhamentoHorizontal}
                alinhamentoVertical={secao.alinhamentoVertical}
                corSubtitulo={secao.corSubtitulo}
                corTitulo={secao.corTitulo}
                corTexto={secao.corTexto}
              />
            );
          }
          case "textoDestaque":
            return (
              <TextoDestaqueSecao
                key={item.id}
                titulo={item.secao.titulo}
                texto={item.secao.texto}
                botao={item.secao.botao}
              />
            );
          case "carrossel":
            return (
              <CarrosselProdutos
                key={item.id}
                titulo={item.titulo}
                linkVerTudo={item.linkVerTudo}
                produtos={item.produtos}
              />
            );
        }
      })}
    </div>
  );
}
