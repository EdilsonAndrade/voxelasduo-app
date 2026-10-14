import Link from "next/link";
import OrcamentoImpressao from "@/components/admin/OrcamentoImpressao";
import styles from "@/components/admin/admin.module.css";
import { buscarCalculosPreco } from "@/lib/produtos/calculosPreco";
import { idsDaQuery } from "@/lib/produtos/orcamento";

export const dynamic = "force-dynamic";

/** Folha de orçamentos dos cálculos marcados na calculadora, para imprimir e mostrar aos sócios (specs/031). */
export default async function ImprimirOrcamentosPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const pedidos = idsDaQuery(ids);
  const calculos = await buscarCalculosPreco(pedidos);

  if (calculos.length === 0) {
    return (
      <div className="container">
        <div className={styles.bar}>
          <h1>Orçamentos</h1>
        </div>
        <p>
          {pedidos.length === 0
            ? "Nenhum cálculo marcado. "
            : "Nenhum dos cálculos marcados foi encontrado — podem ter sido excluídos. "}
          <Link href="/admin/produtos/calculadora">Volte à calculadora</Link> e marque os que quer imprimir.
        </p>
      </div>
    );
  }

  return (
    <OrcamentoImpressao
      naoEncontrados={pedidos.length - calculos.length}
      calculos={calculos.map((c) => ({
        id: c._id!.toString(),
        nome: c.nome,
        alturaCm: c.valores?.alturaCm?.trim() || undefined,
        valores: c.valores,
      }))}
    />
  );
}
