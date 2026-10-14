import Link from "next/link";
import CalculadoraRapida from "@/components/admin/CalculadoraRapida";
import styles from "@/components/admin/admin.module.css";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";

// Precisa do padrão global de taxas atual — não pode ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function CalculadoraPrecoPage() {
  const taxasGlobais = await buscarTaxasCanais();

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Calculadora de preço</h1>
        <Link href="/admin/produtos" className={styles.btnGhost}>
          Voltar aos produtos
        </Link>
      </div>
      <CalculadoraRapida taxasGlobais={taxasGlobais} />
    </div>
  );
}
