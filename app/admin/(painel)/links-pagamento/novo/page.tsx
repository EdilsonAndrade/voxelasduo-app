import type { Metadata } from "next";
import EditorLinkPagamento from "@/components/admin/linksPagamento/EditorLinkPagamento";
import styles from "@/components/admin/admin.module.css";
import { paraLinkResumo } from "@/lib/linksPagamento/apresentacao";
import { linkInicialDoResumo, montarCatalogoLink } from "@/lib/linksPagamento/catalogo";
import { buscarLinkPorId } from "@/lib/linksPagamento/repository";
import { VALIDADE_PADRAO_DIAS } from "@/lib/models/linkPagamento";

export const metadata: Metadata = {
  title: "Novo link de pagamento · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

/** Novo link — `?copiar={id}` abre já preenchido com os itens e dados de outro link. */
export default async function NovoLinkPagamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ copiar?: string }>;
}) {
  const { copiar } = await searchParams;
  const [{ catalogo, taxaSite }, original] = await Promise.all([
    montarCatalogoLink(),
    copiar ? buscarLinkPorId(copiar) : Promise.resolve(null),
  ]);
  const inicial = original
    ? linkInicialDoResumo(paraLinkResumo(original), catalogo, VALIDADE_PADRAO_DIAS)
    : undefined;
  const itensFora = original ? original.link.itens.length - (inicial?.itens.length ?? 0) : 0;

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>{original ? "Duplicar link de pagamento" : "Novo link de pagamento"}</h1>
      </div>
      <p className={styles.mlLinkAviso}>
        {original
          ? "Cópia de um link anterior: ajuste o que precisar e gere um link novo. O link original continua como está."
          : "Escolha os produtos, dê o desconto de cada item e gere o link. O cliente paga por Pix ou cartão no site, e o link vale para uma compra só."}
      </p>
      {copiar && !original && (
        <p className={styles.formError} role="alert">
          Link para copiar não encontrado — comece um link novo.
        </p>
      )}
      {itensFora > 0 && (
        <p className={styles.formError} role="alert">
          {itensFora === 1 ? "1 item" : `${itensFora} itens`} do link original não estão mais no catálogo e ficaram de
          fora.
        </p>
      )}
      <EditorLinkPagamento catalogo={catalogo} taxaSite={taxaSite} inicial={inicial} />
    </div>
  );
}
