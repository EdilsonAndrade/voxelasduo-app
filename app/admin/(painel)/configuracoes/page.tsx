import TaxasCanaisForm from "@/components/admin/TaxasCanaisForm";
import styles from "@/components/admin/admin.module.css";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";

// Lê sempre o valor salvo — sem isso a página seria pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function ConfiguracoesTaxasPage() {
  const taxas = await buscarTaxasCanais();

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Taxas dos canais de venda</h1>
      </div>
      <TaxasCanaisForm valoresIniciais={taxas} />
    </div>
  );
}
