import type { Metadata } from "next";
import AbasFinanceiro from "@/components/admin/financeiro/AbasFinanceiro";
import Impressoras from "@/components/admin/financeiro/Impressoras";
import styles from "@/components/admin/financeiro/financeiro.module.css";
import { listarImpressoras } from "@/lib/financeiro/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Impressoras · painel Voxelas Duo",
};

export default async function ImpressorasPage() {
  const impressoras = await listarImpressoras();
  return (
    <main className={`container ${styles.pagina}`}>
      <div>
        <h1 className={styles.titulo}>Financeiro</h1>
        <p className={styles.subtitulo}>
          O que foi pago em cada máquina. O preço por peça continua usando o desgaste por hora da calculadora — aqui é só para saber
          quando o investimento voltou.
        </p>
      </div>
      <AbasFinanceiro ativa="impressoras" />
      <Impressoras impressoras={impressoras} />
    </main>
  );
}
