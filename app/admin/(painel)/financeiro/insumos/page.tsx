import type { Metadata } from "next";
import AbasFinanceiro from "@/components/admin/financeiro/AbasFinanceiro";
import GraficoInsumos from "@/components/admin/financeiro/GraficoInsumos";
import Insumos from "@/components/admin/financeiro/Insumos";
import styles from "@/components/admin/financeiro/financeiro.module.css";
import { gastoPorCategoria } from "@/lib/financeiro/insumos";
import { listarInsumos } from "@/lib/financeiro/insumosRepository";
import { formatarPreco } from "@/lib/produtos/formato";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insumos · painel Voxelas Duo",
};

const dataBr = (dia: string) => dia.split("-").reverse().join("/");

/** Catálogo de insumos: custo por unidade para a calculadora, compras no caixa. */
export default async function InsumosPage() {
  const insumos = await listarInsumos();
  const total = insumos.reduce((soma, i) => soma + i.totalGastoCentavos, 0);
  const compras = insumos.reduce((soma, i) => soma + i.compras, 0);
  const ultima = insumos.map((i) => i.ultimaCompraEm).sort().at(-1);

  const numeros = [
    { rotulo: "Insumos cadastrados", valor: String(insumos.length), detalhe: "no catálogo" },
    { rotulo: "Já gastamos em insumos", valor: formatarPreco(total), detalhe: "somando todas as compras" },
    { rotulo: "Compras lançadas", valor: String(compras), detalhe: "cada uma virou despesa" },
    { rotulo: "Última compra", valor: ultima ? dataBr(ultima) : "—", detalhe: "data do último lançamento" },
  ];

  const porInsumo = [...insumos]
    .filter((i) => i.totalGastoCentavos > 0)
    .sort((a, b) => b.totalGastoCentavos - a.totalGastoCentavos)
    .map((i) => ({
      chave: i.id,
      rotulo: i.nome,
      valorCentavos: i.totalGastoCentavos,
      detalhe: `${i.compras} ${i.compras === 1 ? "compra" : "compras"}`,
    }));

  const porCategoria = gastoPorCategoria(insumos)
    .filter((c) => c.valorCentavos > 0)
    .map((c) => ({
      chave: c.categoria,
      rotulo: c.rotulo,
      valorCentavos: c.valorCentavos,
      detalhe: `${c.itens} ${c.itens === 1 ? "insumo" : "insumos"}`,
    }));

  return (
    <main className={`container ${styles.pagina}`}>
      <div>
        <h1 className={styles.titulo}>Financeiro</h1>
        <p className={styles.subtitulo}>
          Cadastre o que você compra para produzir e o sistema calcula quanto custa cada unidade. A compra entra nas
          despesas como insumo (não desconta do lucro, porque a calculadora já cobra peça a peça).
        </p>
      </div>
      <AbasFinanceiro ativa="insumos" />

      <section className={styles.numeros} aria-label="Resumo dos insumos">
        {numeros.map((n) => (
          <div key={n.rotulo} className={styles.numero}>
            <div className={styles.numeroRotulo}>{n.rotulo}</div>
            <div className={styles.numeroValor}>{n.valor}</div>
            <div className={styles.numeroDetalhe}>{n.detalhe}</div>
          </div>
        ))}
      </section>

      <div className={styles.graficos}>
        <section className={styles.cartao}>
          <h2 className={styles.graficoTitulo}>Onde foi o dinheiro dos insumos</h2>
          <p className={styles.graficoSub}>Total comprado de cada insumo, do maior para o menor.</p>
          <GraficoInsumos linhas={porInsumo} vazio="Cadastre um insumo para comparar os gastos." />
        </section>
        <section className={styles.cartao}>
          <h2 className={styles.graficoTitulo}>Por categoria</h2>
          <p className={styles.graficoSub}>Filamento, embalagem e os outros insumos lado a lado.</p>
          <GraficoInsumos linhas={porCategoria} vazio="Nenhuma compra lançada ainda." />
        </section>
      </div>

      <Insumos insumos={insumos} />
    </main>
  );
}
