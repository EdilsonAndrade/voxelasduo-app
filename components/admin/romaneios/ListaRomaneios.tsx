"use client";

import Link from "next/link";
import { useState } from "react";
import admin from "@/components/admin/admin.module.css";
import type { StatusLugar } from "@/lib/models/romaneio";
import type { RomaneioResumo } from "@/lib/romaneios/repository";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./romaneios.module.css";

type Filtro = "todos" | StatusLugar;

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "aberto", rotulo: "Abertos" },
  { valor: "acertado", rotulo: "Acertados" },
];

function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Lista de romaneios (specs/038): o que saiu, o que ainda está fora e quanto falta receber. */
export default function ListaRomaneios({ romaneios }: { romaneios: RomaneioResumo[] }) {
  const [filtro, setFiltro] = useState<Filtro>("aberto");
  const visiveis = filtro === "todos" ? romaneios : romaneios.filter((r) => r.status === filtro);

  if (romaneios.length === 0) {
    return (
      <div className={`${styles.card} ${styles.listaVazia}`}>
        <p>Nenhum romaneio ainda. Registre as peças que vão sair para casas, lojas ou pontos de venda e imprima a lista.</p>
        <Link href="/admin/romaneios/novo" className={admin.btnPrimary}>
          + Novo romaneio
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles.filtros}>
        <div className={styles.alternador} role="group" aria-label="Filtrar por status">
          {FILTROS.map((f) => (
            <button key={f.valor} type="button" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}>
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>
      <div className={`${styles.card} ${styles.tabelaWrap}`}>
        {visiveis.length === 0 ? (
          <p className={styles.viaMeta}>Nenhum romaneio com esse status.</p>
        ) : (
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Romaneio</th>
                <th>Saída</th>
                <th>Lugares</th>
                <th>Status</th>
                <th className={styles.num}>Peças</th>
                <th className={styles.num}>Ainda fora</th>
                <th className={styles.num}>Valor levado</th>
                <th className={styles.num}>A receber</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/romaneios/${r.id}`} className={styles.nomeItem}>
                      {r.nome}
                    </Link>
                  </td>
                  <td>{dataCurta(r.dataSaida)}</td>
                  <td className={styles.divisao}>{r.lugares.join(" · ")}</td>
                  <td>
                    <span className={`${styles.status} ${styles[`status_${r.status}`]}`}>{r.status}</span>
                  </td>
                  <td className={styles.num}>{r.pecas}</td>
                  <td className={`${styles.num} ${r.pecasFora === 0 ? styles.zero : ""}`}>{r.pecasFora}</td>
                  <td className={styles.num}>{formatarPreco(r.valorCentavos)}</td>
                  <td className={`${styles.num} ${r.aReceberCentavos > 0 ? styles.aReceber : styles.zero}`}>{formatarPreco(r.aReceberCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
