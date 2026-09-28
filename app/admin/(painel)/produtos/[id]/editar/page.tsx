import { notFound } from "next/navigation";
import ProdutoForm from "@/components/admin/ProdutoForm";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { produtoParaFormulario } from "@/lib/produtos/produtoFormulario";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import styles from "@/components/admin/admin.module.css";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [produto, taxasGlobais] = await Promise.all([buscarProdutoPorId(id), buscarTaxasCanais()]);

  if (!produto) {
    notFound();
  }

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Editar produto</h1>
      </div>
      <ProdutoForm taxasGlobais={taxasGlobais} valoresIniciais={produtoParaFormulario(produto, id)} />
    </div>
  );
}
