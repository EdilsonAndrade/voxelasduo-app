import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AbasFinanceiro from "@/components/admin/financeiro/AbasFinanceiro";
import FormularioVenda from "@/components/admin/financeiro/FormularioVenda";
import styles from "@/components/admin/financeiro/financeiro.module.css";
import { montarCatalogoVenda } from "@/lib/financeiro/catalogo";
import { buscarLancamento } from "@/lib/financeiro/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar venda · painel Voxelas Duo",
};

export default async function EditarVendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lancamento, { opcoes, taxas }] = await Promise.all([buscarLancamento(id), montarCatalogoVenda()]);
  if (!lancamento) notFound();
  return (
    <main className={`container ${styles.pagina}`}>
      <div>
        <h1 className={styles.titulo}>Editar venda</h1>
      </div>
      <AbasFinanceiro ativa="vendas" />
      <FormularioVenda
        catalogo={opcoes}
        taxaSite={{ percentual: taxas.siteTaxaPercentual, fixaCentavos: taxas.siteTaxaFixaCentavos }}
        inicial={lancamento}
      />
    </main>
  );
}
