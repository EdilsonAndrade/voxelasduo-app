import ProdutoForm from "@/components/admin/ProdutoForm";
import styles from "@/components/admin/admin.module.css";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";

// Precisa do padrão global de taxas atual — não pode ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  const taxasGlobais = await buscarTaxasCanais();

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Novo produto</h1>
      </div>
      <ProdutoForm taxasGlobais={taxasGlobais} />
    </div>
  );
}
