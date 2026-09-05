import { notFound } from "next/navigation";
import ProdutoForm from "@/components/admin/ProdutoForm";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import styles from "@/components/admin/admin.module.css";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);

  if (!produto) {
    notFound();
  }

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Editar produto</h1>
      </div>
      <ProdutoForm
        valoresIniciais={{
          id,
          nome: produto.nome,
          descricao: produto.descricao,
          precoReais: (produto.preco / 100).toFixed(2),
          estoque: String(produto.estoque),
          categoria: produto.categoria,
          fotos: produto.fotos,
          mercadoLivreId: produto.integracoes?.mercadoLivreId ?? "",
          shopeeItemId: produto.integracoes?.shopeeItemId ?? "",
        }}
      />
    </div>
  );
}
