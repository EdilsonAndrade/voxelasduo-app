import type { Metadata } from "next";
import Link from "next/link";
import ListaLinksPagamento from "@/components/admin/linksPagamento/ListaLinksPagamento";
import styles from "@/components/admin/admin.module.css";
import { paraLinkResumo } from "@/lib/linksPagamento/apresentacao";
import { listarLinksPagamento } from "@/lib/linksPagamento/repository";

export const metadata: Metadata = {
  title: "Links de pagamento · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

/** Links de pagamento: pedidos montados pela loja, com desconto por item, pagos pelo checkout do site. */
export default async function LinksPagamentoPage() {
  const agora = new Date();
  const links = (await listarLinksPagamento()).map((link) => paraLinkResumo(link, agora));
  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Links de pagamento</h1>
        <div className={styles.barAcoes}>
          <Link href="/admin/links-pagamento/novo" className={styles.btnPrimary}>
            + Novo link
          </Link>
        </div>
      </div>
      <ListaLinksPagamento links={links} />
    </div>
  );
}
