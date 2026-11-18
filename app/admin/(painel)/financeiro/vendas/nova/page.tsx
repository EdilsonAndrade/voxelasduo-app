import type { Metadata } from "next";
import AbasFinanceiro from "@/components/admin/financeiro/AbasFinanceiro";
import FormularioVenda from "@/components/admin/financeiro/FormularioVenda";
import styles from "@/components/admin/financeiro/financeiro.module.css";
import { montarCatalogoVenda } from "@/lib/financeiro/catalogo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lançar venda · painel Voxelas Duo",
};

export default async function NovaVendaPage() {
  const { opcoes, taxas } = await montarCatalogoVenda();
  return (
    <main className={`container ${styles.pagina}`}>
      <div>
        <h1 className={styles.titulo}>Lançar venda</h1>
        <p className={styles.subtitulo}>Produtos da loja (com ou sem estoque), itens da calculadora ou qualquer produto digitado.</p>
      </div>
      <AbasFinanceiro ativa="vendas" />
      <FormularioVenda
        catalogo={opcoes}
        taxaSite={{ percentual: taxas.siteTaxaPercentual, fixaCentavos: taxas.siteTaxaFixaCentavos }}
      />
    </main>
  );
}
