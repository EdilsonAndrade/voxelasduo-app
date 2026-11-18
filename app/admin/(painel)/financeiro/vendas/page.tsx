import type { Metadata } from "next";
import Link from "next/link";
import AbasFinanceiro from "@/components/admin/financeiro/AbasFinanceiro";
import ListaVendas from "@/components/admin/financeiro/ListaVendas";
import styles from "@/components/admin/financeiro/financeiro.module.css";
import { listarLancamentos } from "@/lib/financeiro/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendas lançadas · painel Voxelas Duo",
};

export default async function VendasLancadasPage() {
  const lancamentos = await listarLancamentos();
  return (
    <main className={`container ${styles.pagina}`}>
      <div className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Financeiro</h1>
          <p className={styles.subtitulo}>Vendas pagas por fora do site: pix, dinheiro, maquininha, link avulso.</p>
        </div>
        <Link href="/admin/financeiro/vendas/nova" className={styles.botaoPrimario}>
          + Lançar venda
        </Link>
      </div>
      <AbasFinanceiro ativa="vendas" />
      <ListaVendas lancamentos={lancamentos} />
    </main>
  );
}
