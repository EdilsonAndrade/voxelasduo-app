import type { Metadata } from "next";
import AbasFinanceiro from "@/components/admin/financeiro/AbasFinanceiro";
import Despesas from "@/components/admin/financeiro/Despesas";
import styles from "@/components/admin/financeiro/financeiro.module.css";
import { somar } from "@/lib/financeiro/painel";
import { carregarDadosPainel } from "@/lib/financeiro/repository";
import { ehInsumo } from "@/lib/models/financeiro";
import { formatarPreco } from "@/lib/produtos/formato";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Despesas · painel Voxelas Duo",
};

/** Tudo o que já saiu do caixa (insumos, despesas, impressoras) contra o que entrou das vendas. */
export default async function DespesasPage() {
  const { vendas, impressoras, despesas } = await carregarDadosPainel();
  const insumos = despesas.filter((d) => ehInsumo(d.categoria)).reduce((s, d) => s + d.valorCentavos, 0);
  const negocio = despesas.filter((d) => !ehInsumo(d.categoria)).reduce((s, d) => s + d.valorCentavos, 0);
  const maquinas = impressoras.reduce((s, i) => s + i.valorCentavos, 0);
  const gasto = insumos + negocio + maquinas;
  const totais = somar(vendas);
  const recebido = totais.receitaCentavos - totais.taxaCentavos;
  const saldo = recebido - gasto;

  const numeros = [
    { rotulo: "Insumos comprados", valor: insumos, detalhe: "filamento, embalagem…" },
    { rotulo: "Despesas do negócio", valor: negocio, detalhe: "impostos, anúncios, ferramentas…" },
    { rotulo: "Impressoras", valor: maquinas, detalhe: `${impressoras.length} ${impressoras.length === 1 ? "máquina" : "máquinas"}` },
    { rotulo: "Já gastamos", valor: gasto, detalhe: "tudo somado" },
    { rotulo: "Entrou das vendas", valor: recebido, detalhe: "vendido − taxas, sem frete" },
    { rotulo: saldo < 0 ? "Ainda no vermelho" : "Saldo no caixa", valor: saldo, detalhe: "entrou − gastamos", negativo: saldo < 0 },
  ];

  return (
    <main className={`container ${styles.pagina}`}>
      <div>
        <h1 className={styles.titulo}>Financeiro</h1>
        <p className={styles.subtitulo}>
          Lance o que já foi comprado, mesmo que ainda não tenha sido usado. Insumos não descontam do lucro (a calculadora já cobra peça a
          peça); despesas do negócio, sim.
        </p>
      </div>
      <AbasFinanceiro ativa="despesas" />

      <section className={styles.numeros} aria-label="Quanto já gastamos desde o início">
        {numeros.map((n) => (
          <div key={n.rotulo} className={styles.numero}>
            <div className={styles.numeroRotulo}>{n.rotulo}</div>
            <div className={`${styles.numeroValor} ${n.negativo ? styles.negativo : ""}`}>{formatarPreco(n.valor)}</div>
            <div className={styles.numeroDetalhe}>{n.detalhe}</div>
          </div>
        ))}
      </section>

      <Despesas despesas={despesas} />
    </main>
  );
}
