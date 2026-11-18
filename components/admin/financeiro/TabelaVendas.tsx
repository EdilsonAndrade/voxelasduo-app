import Link from "next/link";
import { lucroDa, ROTULO_ORIGEM_VENDA, type VendaPainel } from "@/lib/financeiro/painel";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./financeiro.module.css";

const ROTULO_TAXA = { real: "Mercado Pago", estimada: "estimada", informada: "lançada" } as const;

const dataBr = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Sao_Paulo" });

function percentual(parte: number, base: number): string {
  if (base <= 0) return "—";
  return `${((parte / base) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/** Venda a venda do período, para conferir taxa, desconto e líquido com o extrato. */
export default function TabelaVendas({ vendas }: { vendas: VendaPainel[] }) {
  const ordenadas = [...vendas].sort((a, b) => b.data.getTime() - a.data.getTime());
  if (ordenadas.length === 0) return <p className={styles.vazio}>Nenhuma venda no período.</p>;

  return (
    <div className={styles.rolagem}>
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th>Data</th>
            <th>Venda</th>
            <th className={styles.num}>Cobrado</th>
            <th className={styles.num}>Desconto</th>
            <th className={styles.num}>Frete</th>
            <th className={styles.num}>Taxa</th>
            <th className={styles.num}>Custo</th>
            <th className={styles.num}>Lucro</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((v, i) => {
            const d = v.detalhe;
            const frete = d?.freteCentavos ?? 0;
            const mp = d?.mercadoPago;
            // Base da % = o que foi cobrado do cliente (como o MP calcula a tarifa).
            const cobrado = v.receitaCentavos + frete;
            const lucro = lucroDa(v);
            return (
              <tr key={`${v.data.getTime()}-${i}`}>
                <td>{dataBr(v.data)}</td>
                <td>
                  {d?.href ? <Link href={d.href}>{d.titulo}</Link> : <strong>{d?.titulo ?? "Venda"}</strong>}
                  <div className={styles.dicaCampo}>{ROTULO_ORIGEM_VENDA[v.origem]}</div>
                  {mp && (
                    <div className={styles.dicaCampo}>
                      Cliente pagou {formatarPreco(mp.clientePagouCentavos)}
                      {mp.parcelas > 1 ? ` em ${mp.parcelas}x` : ""}
                      {mp.jurosClienteCentavos > 0 ? ` (juros de ${formatarPreco(mp.jurosClienteCentavos)} por conta dele)` : ""}
                      {mp.cupomCentavos > 0 ? ` · cupom MP ${formatarPreco(mp.cupomCentavos)}` : ""} · caiu na conta{" "}
                      <strong>{formatarPreco(mp.liquidoCentavos)}</strong>
                    </div>
                  )}
                </td>
                <td className={styles.num}>{formatarPreco(cobrado)}</td>
                <td className={styles.num}>{d?.descontoCentavos ? `−${formatarPreco(d.descontoCentavos)}` : "—"}</td>
                <td className={styles.num}>{frete ? formatarPreco(frete) : "—"}</td>
                <td className={styles.num}>
                  {v.taxaCentavos ? `−${formatarPreco(v.taxaCentavos)}` : "—"}
                  <div className={styles.dicaCampo}>
                    {percentual(v.taxaCentavos, mp?.clientePagouCentavos ? mp.clientePagouCentavos - mp.jurosClienteCentavos : cobrado)}
                    {d && ` · ${ROTULO_TAXA[d.taxa]}`}
                  </div>
                </td>
                <td className={styles.num}>
                  {v.custoCentavos ? `−${formatarPreco(v.custoCentavos)}` : "—"}
                  {v.unidadesSemCusto > 0 && <div className={styles.dicaCampo}>falta custo</div>}
                </td>
                <td className={`${styles.num} ${lucro < 0 ? styles.negativo : ""}`}>
                  <strong>{formatarPreco(lucro)}</strong>
                  <div className={styles.dicaCampo}>{percentual(lucro, v.receitaCentavos)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
