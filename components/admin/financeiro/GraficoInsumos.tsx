import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./financeiro.module.css";

export interface LinhaComparacao {
  chave: string;
  rotulo: string;
  valorCentavos: number;
  detalhe?: string;
}

/** Comparação de gasto em barras horizontais — a maior barra é o maior gasto. */
export default function GraficoInsumos({ linhas, vazio }: { linhas: LinhaComparacao[]; vazio: string }) {
  if (linhas.length === 0) return <p className={styles.vazio}>{vazio}</p>;
  const maior = Math.max(1, ...linhas.map((l) => l.valorCentavos));
  const total = linhas.reduce((soma, l) => soma + l.valorCentavos, 0);

  return (
    <ul className={styles.comparacao}>
      {linhas.map((l) => {
        const parte = total > 0 ? Math.round((l.valorCentavos / total) * 100) : 0;
        return (
          <li key={l.chave} className={styles.comparacaoLinha}>
            <span className={styles.comparacaoNome} title={l.rotulo}>
              {l.rotulo}
              {l.detalhe && <span className={styles.dicaCampo}> · {l.detalhe}</span>}
            </span>
            <span className={styles.origemTrilho} aria-hidden>
              <span
                className={`${styles.origemBarra} ${styles.comparacaoBarra}`}
                style={{ width: `${Math.max(1, (l.valorCentavos / maior) * 100)}%` }}
              />
            </span>
            <span className={styles.origemValor}>
              {formatarPreco(l.valorCentavos)}
              <span className={styles.dicaCampo}> {parte}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
