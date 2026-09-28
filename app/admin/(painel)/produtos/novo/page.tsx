import { notFound } from "next/navigation";
import ProdutoForm from "@/components/admin/ProdutoForm";
import styles from "@/components/admin/admin.module.css";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { produtoParaDuplicar } from "@/lib/produtos/produtoFormulario";

// Precisa do padrão global de taxas atual — não pode ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicarDe?: string }>;
}) {
  const { duplicarDe } = await searchParams;
  const [taxasGlobais, original] = await Promise.all([
    buscarTaxasCanais(),
    duplicarDe ? buscarProdutoPorId(duplicarDe) : null,
  ]);

  if (duplicarDe && !original) {
    notFound();
  }

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>{original ? `Duplicar produto: ${original.nome}` : "Novo produto"}</h1>
      </div>
      <ProdutoForm
        taxasGlobais={taxasGlobais}
        valoresIniciais={original ? produtoParaDuplicar(original) : undefined}
      />
    </div>
  );
}
