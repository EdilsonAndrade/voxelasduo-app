"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./admin.module.css";

/** Produto que tinha margem própria na régua antiga (% sobre o custo) — spec 034. */
export interface MargemParaRevisar {
  id: string;
  nome: string;
  minimaSobreCusto?: number;
  desejadaSobreCusto?: number;
  /** Equivalentes em % do preço na Shopee — `null` sem custo configurado. */
  sugestaoMinimaPreco: number | null;
  sugestaoDesejadaPreco: number | null;
}

function porcento(valor: number | undefined | null): string {
  return valor === undefined || valor === null ? "—" : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/**
 * Lista "Margens para revisar": as margens próprias foram zeradas na troca
 * para a régua do preço; aqui o vendedor vê o valor antigo, a sugestão
 * equivalente e marca cada produto como revisado.
 */
export default function MargensParaRevisar({ itens }: { itens: MargemParaRevisar[] }) {
  const [restantes, setRestantes] = useState(itens);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (restantes.length === 0) return null;

  async function marcarRevisado(id: string) {
    setEnviando(id);
    setErro(null);
    try {
      const resposta = await fetch(`/api/admin/produtos/${id}/margens-revisar`, { method: "DELETE" });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        setErro(`${dados.erro ?? "Não foi possível marcar como revisado."} (status ${resposta.status})`);
        return;
      }
      setRestantes((atual) => atual.filter((item) => item.id !== id));
    } catch {
      setErro("Não foi possível marcar como revisado no momento.");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <section className={styles.field}>
      <h2>Margens para revisar</h2>
      <span className={styles.mlLinkAviso}>
        As margens agora são % do preço de venda. Estes produtos tinham margem própria na conta antiga (% sobre o
        custo) e passaram a usar o padrão acima. Abra cada um, digite a margem que quiser (a sugestão é o
        equivalente na Shopee) ou deixe no padrão, e marque como revisado.
      </span>
      {erro && <span className={styles.fieldError}>{erro}</span>}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Antes (% sobre o custo)</th>
            <th>Sugestão (% do preço na Shopee)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {restantes.map((item) => (
            <tr key={item.id}>
              <td>{item.nome}</td>
              <td>
                mín. {porcento(item.minimaSobreCusto)} · desej. {porcento(item.desejadaSobreCusto)}
              </td>
              <td>
                {item.sugestaoMinimaPreco === null && item.sugestaoDesejadaPreco === null
                  ? "Sem custo cadastrado"
                  : `mín. ${porcento(item.sugestaoMinimaPreco)} · desej. ${porcento(item.sugestaoDesejadaPreco)}`}
              </td>
              <td>
                <div className={styles.row}>
                  <Link className={styles.btnGhost} href={`/admin/produtos/${item.id}/editar`}>
                    Abrir
                  </Link>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    disabled={enviando === item.id}
                    onClick={() => marcarRevisado(item.id)}
                  >
                    {enviando === item.id ? "Salvando…" : "Marcar revisado"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
