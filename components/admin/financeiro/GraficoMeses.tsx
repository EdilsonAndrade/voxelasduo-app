"use client";

import { useState } from "react";
import type { MesPainel } from "@/lib/financeiro/painel";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./financeiro.module.css";

const L = 640;
const A = 230;
const M = { topo: 12, base: 26, esquerda: 52, direita: 8 };

/** Degrau "redondo" para a escala (1, 2, 5 × 10ⁿ reais). */
function passo(maximo: number): number {
  const bruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  return [1, 2, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
}

function reaisCurtos(centavos: number): string {
  const reais = centavos / 100;
  return Math.abs(reais) >= 1000 ? `${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : reais.toLocaleString("pt-BR");
}

/** Lucro de cada mês: barra para cima = lucro, para baixo = prejuízo. */
export default function GraficoMeses({ meses }: { meses: MesPainel[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const valores = meses.map((m) => m.lucroCentavos);
  const max = Math.max(0, ...valores);
  const min = Math.min(0, ...valores);
  const degrau = passo(Math.max(max - min, 100));
  const topo = Math.ceil(max / degrau) * degrau || degrau;
  const fundo = Math.floor(min / degrau) * degrau;
  const altura = A - M.topo - M.base;
  const y = (v: number) => M.topo + ((topo - v) / (topo - fundo)) * altura;
  const linhas: number[] = [];
  for (let v = fundo; v <= topo; v += degrau) linhas.push(v);

  const coluna = (L - M.esquerda - M.direita) / meses.length;
  const larguraBarra = Math.min(28, coluna * 0.6);
  const mes = ativo !== null ? meses[ativo] : null;

  return (
    <div className={styles.grafico}>
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Lucro por mês nos últimos 12 meses">
        {linhas.map((v) => (
          <g key={v}>
            <line className={v === 0 ? styles.linhaZero : styles.grade} x1={M.esquerda} x2={L - M.direita} y1={y(v)} y2={y(v)} />
            <text className={styles.eixoTexto} x={M.esquerda - 6} y={y(v) + 4} textAnchor="end">
              {reaisCurtos(v)}
            </text>
          </g>
        ))}
        {meses.map((m, i) => {
          const cx = M.esquerda + coluna * i + coluna / 2;
          const positivo = m.lucroCentavos >= 0;
          const y0 = y(0);
          const y1 = y(m.lucroCentavos);
          const h = Math.abs(y1 - y0);
          const r = Math.min(4, h / 2, larguraBarra / 2);
          const x = cx - larguraBarra / 2;
          // Ponta arredondada só no lado de fora; a base fica reta, encostada no zero.
          const d = positivo
            ? `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + larguraBarra - r} Q${x + larguraBarra},${y1} ${x + larguraBarra},${y1 + r} V${y0} Z`
            : `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + larguraBarra - r} Q${x + larguraBarra},${y1} ${x + larguraBarra},${y1 - r} V${y0} Z`;
          return (
            <g key={m.mes}>
              <rect
                className={`${styles.alvo} ${ativo === i ? styles.alvoAtivo : ""}`}
                x={M.esquerda + coluna * i}
                y={M.topo}
                width={coluna}
                height={altura}
                tabIndex={0}
                aria-label={`${m.rotulo}: lucro ${formatarPreco(m.lucroCentavos)}, receita ${formatarPreco(m.receitaCentavos)}`}
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
              />
              {h > 0 && <path d={d} className={positivo ? styles.barraPositiva : styles.barraNegativa} pointerEvents="none" />}
              <text className={styles.eixoTexto} x={cx} y={A - 8} textAnchor="middle">
                {m.rotulo.slice(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>
      {mes && ativo !== null && (
        <div
          className={styles.dica}
          style={{
            left: `${((M.esquerda + coluna * ativo + coluna / 2) / L) * 100}%`,
            top: `${(Math.min(y(mes.lucroCentavos), y(0)) / A) * 100}%`,
          }}
        >
          <strong>{mes.rotulo}</strong>
          Lucro {formatarPreco(mes.lucroCentavos)}
          <br />
          Receita {formatarPreco(mes.receitaCentavos)} · {mes.vendas} {mes.vendas === 1 ? "venda" : "vendas"}
        </div>
      )}
      <details className={styles.tabelaDados}>
        <summary>Ver em tabela</summary>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>Mês</th>
              <th className={styles.num}>Vendas</th>
              <th className={styles.num}>Receita</th>
              <th className={styles.num}>Lucro</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.mes}>
                <td>{m.rotulo}</td>
                <td className={styles.num}>{m.vendas}</td>
                <td className={styles.num}>{formatarPreco(m.receitaCentavos)}</td>
                <td className={`${styles.num} ${m.lucroCentavos < 0 ? styles.negativo : ""}`}>{formatarPreco(m.lucroCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
