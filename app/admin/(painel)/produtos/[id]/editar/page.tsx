import Link from "next/link";
import { notFound } from "next/navigation";
import ProdutoForm from "@/components/admin/ProdutoForm";
import ProducaoDoProduto from "@/components/admin/producao/ProducaoDoProduto";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { produtoParaFormulario } from "@/lib/produtos/produtoFormulario";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { listarCategoriasResumo } from "@/lib/categorias/repository";
import { buscarCalculoDoProduto } from "@/lib/produtos/calculosPreco";
import styles from "@/components/admin/admin.module.css";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // As taxas antes do produto: a primeira leitura delas migra as margens antigas do produto (spec 034).
  const taxasGlobais = await buscarTaxasCanais();
  const [produto, categorias, calculo] = await Promise.all([
    buscarProdutoPorId(id),
    listarCategoriasResumo(),
    buscarCalculoDoProduto(id),
  ]);

  if (!produto) {
    notFound();
  }

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Editar produto</h1>
        <div className={styles.barAcoes}>
          <Link href={`/admin/produtos/calculadora?produto=${id}`} className={styles.btnGhost}>
            {calculo ? "Ver cálculo de preço" : "Levar para a calculadora"}
          </Link>
        </div>
      </div>
      <ProdutoForm
        taxasGlobais={taxasGlobais}
        categorias={categorias}
        valoresIniciais={produtoParaFormulario(produto, id)}
        margensAntigas={produto.margensParaRevisar}
      />
      <ProducaoDoProduto produtoId={id} />
    </div>
  );
}
