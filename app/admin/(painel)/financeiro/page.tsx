import type { Metadata } from "next";
import Link from "next/link";
import AbasFinanceiro from "@/components/admin/financeiro/AbasFinanceiro";
import GraficoMeses from "@/components/admin/financeiro/GraficoMeses";
import GraficoOrigens from "@/components/admin/financeiro/GraficoOrigens";
import TabelaVendas from "@/components/admin/financeiro/TabelaVendas";
import ReguaImpressoras from "@/components/admin/financeiro/ReguaImpressoras";
import styles from "@/components/admin/financeiro/financeiro.module.css";
import { dataDoDia } from "@/lib/financeiro/datas";
import {
  calcularPayback,
  filtrarPeriodo,
  PERIODOS,
  porMes,
  porOrigem,
  ROTULO_PERIODO,
  somar,
  type Periodo,
} from "@/lib/financeiro/painel";
import { carregarDadosPainel } from "@/lib/financeiro/repository";
import { formatarPreco } from "@/lib/produtos/formato";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Financeiro · painel Voxelas Duo",
};

/** Lucro de todas as vendas (site, link, marketplaces e lançamentos à mão) e o retorno das impressoras. */
export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { periodo: param } = await searchParams;
  const periodo: Periodo = PERIODOS.includes(param as Periodo) ? (param as Periodo) : "mes";
  const agora = new Date();
  const { vendas, impressoras } = await carregarDadosPainel();

  const doPeriodo = filtrarPeriodo(vendas, periodo, agora);
  const totais = somar(doPeriodo);
  const payback = calcularPayback(
    vendas,
    impressoras.map((i) => ({ ...i, dataCompra: dataDoDia(i.dataCompra)! })),
    agora
  );

  const numeros = [
    { rotulo: "Vendido", valor: totais.receitaCentavos, detalhe: `${totais.vendas} ${totais.vendas === 1 ? "venda" : "vendas"}` },
    { rotulo: "Taxas", valor: -totais.taxaCentavos, detalhe: "Mercado Pago, marketplaces, maquininha" },
    { rotulo: "Custo de produção", valor: -totais.custoCentavos, detalhe: "filamento, energia, máquina, mão de obra" },
    {
      rotulo: totais.lucroCentavos < 0 ? "Prejuízo" : "Lucro",
      valor: totais.lucroCentavos,
      detalhe: totais.margemPercentual !== null ? `${totais.margemPercentual.toLocaleString("pt-BR")}% do vendido` : "—",
    },
  ];

  return (
    <main className={`container ${styles.pagina}`}>
      <div className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Financeiro</h1>
          <p className={styles.subtitulo}>Pedidos pagos do site, links, Mercado Livre e Shopee, mais as vendas lançadas à mão.</p>
        </div>
        <Link href="/admin/financeiro/vendas/nova" className={styles.botaoPrimario}>
          + Lançar venda
        </Link>
      </div>
      <AbasFinanceiro ativa="painel" />

      <ReguaImpressoras
        {...payback}
        impressoras={payback.impressoras.map(({ id, nome, valorCentavos, pagoCentavos, paga }) => ({
          id,
          nome,
          valorCentavos,
          pagoCentavos,
          paga,
        }))}
      />

      <nav className={styles.periodos} aria-label="Período">
        {PERIODOS.map((p) => (
          <Link
            key={p}
            href={p === "mes" ? "/admin/financeiro" : `/admin/financeiro?periodo=${p}`}
            className={`${styles.periodo} ${p === periodo ? styles.periodoAtivo : ""}`}
            aria-current={p === periodo ? "page" : undefined}
          >
            {ROTULO_PERIODO[p]}
          </Link>
        ))}
      </nav>

      <section className={styles.numeros} aria-label={`Resumo — ${ROTULO_PERIODO[periodo]}`}>
        {numeros.map((n) => (
          <div key={n.rotulo} className={styles.numero}>
            <div className={styles.numeroRotulo}>{n.rotulo}</div>
            <div className={`${styles.numeroValor} ${n.rotulo === "Prejuízo" ? styles.negativo : ""}`}>{formatarPreco(n.valor)}</div>
            <div className={styles.numeroDetalhe}>{n.detalhe}</div>
          </div>
        ))}
      </section>

      {totais.unidadesSemCusto > 0 && (
        <p className={styles.aviso}>
          {totais.unidadesSemCusto} {totais.unidadesSemCusto === 1 ? "unidade vendida está" : "unidades vendidas estão"} sem custo
          cadastrado e {totais.unidadesSemCusto === 1 ? "entrou" : "entraram"} com custo zero — o lucro real é menor. Preencha o custo
          no produto, na calculadora ou na venda lançada.
        </p>
      )}

      <div className={styles.graficos}>
        <section className={styles.cartao}>
          <h2 className={styles.graficoTitulo}>Lucro por mês</h2>
          <p className={styles.graficoSub}>Últimos 12 meses, todas as origens. Abaixo da linha = prejuízo.</p>
          <GraficoMeses meses={porMes(vendas, agora, 12)} />
        </section>
        <section className={styles.cartao}>
          <h2 className={styles.graficoTitulo}>De onde vem o lucro</h2>
          <p className={styles.graficoSub}>{ROTULO_PERIODO[periodo]} · passe o mouse para ver receita, taxas e custo.</p>
          <GraficoOrigens origens={porOrigem(doPeriodo)} />
        </section>
      </div>

      <section className={styles.cartao}>
        <h2 className={styles.graficoTitulo}>Venda a venda</h2>
        <p className={styles.graficoSub}>
          {ROTULO_PERIODO[periodo]} · confira com o extrato: taxa “Mercado Pago” é a cobrada de verdade; “estimada” usa a tabela do canal.
        </p>
        <TabelaVendas vendas={doPeriodo} />
      </section>

      <p className={styles.subtitulo}>
        Custos dos pedidos usam o cadastro atual do produto. Taxa do Mercado Livre é estimada (14% + R$ 6,50 abaixo de R$ 79), a da Shopee
        segue a tabela por faixa e a do site/link vem do Mercado Pago (ou da taxa cadastrada, se a consulta falhar). Frete não conta como receita.
      </p>
    </main>
  );
}
