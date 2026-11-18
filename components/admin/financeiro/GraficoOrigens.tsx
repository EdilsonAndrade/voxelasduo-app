import type { OrigemPainel } from "@/lib/financeiro/painel";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./financeiro.module.css";

/** Lucro por canal/meio de pagamento — barras horizontais, prejuízo em outra cor. */
export default function GraficoOrigens({ origens }: { origens: OrigemPainel[] }) {
  if (origens.length === 0) return <p className={styles.vazio}>Nenhuma venda no período.</p>;
  const maior = Math.max(1, ...origens.map((o) => Math.abs(o.lucroCentavos)));
  return (
    <ul className={styles.origens}>
      {origens.map((o) => (
        <li
          key={o.origem}
          className={styles.origem}
          title={`${o.rotulo}: ${o.vendas} ${o.vendas === 1 ? "venda" : "vendas"} · receita ${formatarPreco(o.receitaCentavos)} · taxas ${formatarPreco(o.taxaCentavos)} · custo ${formatarPreco(o.custoCentavos)}`}
        >
          <span>{o.rotulo}</span>
          <span className={styles.origemTrilho} aria-hidden>
            <span
              className={`${styles.origemBarra} ${o.lucroCentavos < 0 ? styles.origemBarraNegativa : ""}`}
              style={{ width: `${Math.max(1, (Math.abs(o.lucroCentavos) / maior) * 100)}%` }}
            />
          </span>
          <span className={`${styles.origemValor} ${o.lucroCentavos < 0 ? styles.negativo : ""}`}>{formatarPreco(o.lucroCentavos)}</span>
        </li>
      ))}
    </ul>
  );
}
