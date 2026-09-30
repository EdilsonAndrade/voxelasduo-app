import { notFound } from "next/navigation";
import ProdutoForm from "@/components/admin/ProdutoForm";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { produtoParaFormulario } from "@/lib/produtos/produtoFormulario";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { listarCategoriasResumo } from "@/lib/categorias/repository";
import styles from "@/components/admin/admin.module.css";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [produto, taxasGlobais, categorias] = await Promise.all([
    buscarProdutoPorId(id),
    buscarTaxasCanais(),
    listarCategoriasResumo(),
  ]);

  if (!produto) {
    notFound();
  }

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Editar produto</h1>
      </div>
      <ProdutoForm
        taxasGlobais={taxasGlobais}
        categorias={categorias}
        valoresIniciais={produtoParaFormulario(produto, id)}
      />
    </div>
  );
}
