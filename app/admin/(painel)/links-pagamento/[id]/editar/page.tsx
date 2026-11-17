import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditorLinkPagamento from "@/components/admin/linksPagamento/EditorLinkPagamento";
import styles from "@/components/admin/admin.module.css";
import { paraLinkResumo } from "@/lib/linksPagamento/apresentacao";
import { linkInicialDoResumo, montarCatalogoLink } from "@/lib/linksPagamento/catalogo";
import { buscarLinkPorId } from "@/lib/linksPagamento/repository";
import { VALIDADE_MAXIMA_DIAS, VALIDADE_PADRAO_DIAS } from "@/lib/models/linkPagamento";

export const metadata: Metadata = {
  title: "Editar link de pagamento · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Edita um link que ainda não virou pedido — o código (URL enviada ao cliente) não muda. */
export default async function EditarLinkPagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [encontrado, { catalogo, taxaSite }] = await Promise.all([buscarLinkPorId(id), montarCatalogoLink()]);
  if (!encontrado) notFound();

  const resumo = paraLinkResumo(encontrado);
  const travado = Boolean(encontrado.link.pedidoId || encontrado.link.canceladoEm);
  // Mantém os dias que faltam; link vencido volta com a validade padrão.
  const restantes = Math.ceil((encontrado.link.validoAte.getTime() - Date.now()) / DIA_MS);
  const validadeDias = restantes >= 1 ? Math.min(restantes, VALIDADE_MAXIMA_DIAS) : VALIDADE_PADRAO_DIAS;
  const inicial = linkInicialDoResumo(resumo, catalogo, validadeDias);
  const itensFora = encontrado.link.itens.length - inicial.itens.length;

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Editar link de pagamento</h1>
        <div className={styles.barAcoes}>
          <Link href={`/admin/links-pagamento/novo?copiar=${id}`} className={styles.btnGhost}>
            Duplicar
          </Link>
        </div>
      </div>
      {travado ? (
        <p className={styles.formError} role="alert">
          {encontrado.link.pedidoId
            ? "Este link já virou pedido e não pode mais ser editado. Use “Duplicar” para gerar um novo."
            : "Este link foi cancelado e não pode mais ser editado. Use “Duplicar” para gerar um novo."}
        </p>
      ) : (
        <>
          <p className={styles.mlLinkAviso}>
            O endereço do link continua o mesmo: quem já recebeu vê as mudanças ao abrir de novo. A validade conta a
            partir de hoje.
          </p>
          {itensFora > 0 && (
            <p className={styles.formError} role="alert">
              {itensFora === 1 ? "1 item" : `${itensFora} itens`} do link não estão mais no catálogo e ficaram de fora
              — ao salvar, saem do link.
            </p>
          )}
          <EditorLinkPagamento catalogo={catalogo} taxaSite={taxaSite} inicial={inicial} linkId={id} />
        </>
      )}
    </div>
  );
}
