"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROTULO_MEIO_PAGAMENTO, type LancamentoVendaJson } from "@/lib/models/financeiro";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./financeiro.module.css";

function totais(l: LancamentoVendaJson) {
  const receita = l.itens.reduce((s, i) => s + i.precoUnitarioCentavos * i.quantidade, 0);
  const custo = l.itens.reduce((s, i) => s + (i.custoUnitarioCentavos ?? 0) * i.quantidade, 0);
  const semCusto = l.itens.some((i) => i.custoUnitarioCentavos === null);
  return { receita, lucro: receita - l.taxaCentavos - custo, semCusto };
}

const dataBr = (dia: string) => dia.split("-").reverse().join("/");

export default function ListaVendas({ lancamentos }: { lancamentos: LancamentoVendaJson[] }) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  async function excluir(l: LancamentoVendaJson) {
    if (!window.confirm(`Excluir a venda de ${dataBr(l.data)}${l.cliente ? ` para ${l.cliente}` : ""}?`)) return;
    setExcluindo(l.id);
    setErro("");
    try {
      const resposta = await fetch(`/api/admin/financeiro/vendas/${l.id}`, { method: "DELETE" });
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string };
        setErro(`${corpo.erro ?? "Não foi possível excluir."} (erro ${resposta.status})`);
        return;
      }
      router.refresh();
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setExcluindo(null);
    }
  }

  if (lancamentos.length === 0) {
    return (
      <div className={`${styles.cartao} ${styles.vazio}`}>
        <p>Nenhuma venda lançada ainda.</p>
        <Link href="/admin/financeiro/vendas/nova" className={styles.botaoPrimario}>
          + Lançar a primeira venda
        </Link>
      </div>
    );
  }

  return (
    <div className={`${styles.cartao} ${styles.rolagem}`}>
      {erro && (
        <p className={styles.erroGeral} role="alert">
          {erro}
        </p>
      )}
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Produtos</th>
            <th>Pagamento</th>
            <th className={styles.num}>Vendido</th>
            <th className={styles.num}>Lucro</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lancamentos.map((l) => {
            const t = totais(l);
            return (
              <tr key={l.id}>
                <td>{dataBr(l.data)}</td>
                <td>{l.cliente ?? "—"}</td>
                <td>
                  <ul className={styles.itensResumo}>
                    {l.itens.map((i, n) => (
                      <li key={n}>
                        {i.quantidade}× {i.nome}{" "}
                        {i.origem === "calculo" && i.calculoId && (
                          <Link href={`/admin/produtos/calculadora?id=${i.calculoId}`} className={styles.selo}>
                            calculadora ↗
                          </Link>
                        )}
                        {i.origem === "avulso" && <span className={styles.selo}>digitado</span>}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>{ROTULO_MEIO_PAGAMENTO[l.meio]}</td>
                <td className={styles.num}>{formatarPreco(t.receita)}</td>
                <td className={`${styles.num} ${t.lucro < 0 ? styles.negativo : ""}`}>
                  {formatarPreco(t.lucro)}
                  {t.semCusto && <div className={styles.dicaCampo}>falta custo</div>}
                </td>
                <td>
                  <div className={styles.acoesLinha}>
                    <Link href={`/admin/financeiro/vendas/${l.id}`} className={styles.botao}>
                      Editar
                    </Link>
                    <button type="button" className={styles.botaoPerigo} onClick={() => excluir(l)} disabled={excluindo === l.id}>
                      {excluindo === l.id ? "Excluindo…" : "Excluir"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
