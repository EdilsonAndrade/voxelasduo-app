"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import calc from "./calculadoraRapida.module.css";
import ConfirmModal from "./ConfirmModal";
import { combinaBusca } from "@/lib/busca/texto";

export interface CalculoResumo {
  id: string;
  nome: string;
  /** Altura da peça em cm, quando informada. */
  alturaCm?: string;
  atualizadoEm: string;
  virouProduto: boolean;
}

/** Lista dos cálculos guardados na calculadora: abrir para editar, excluir ou marcar para imprimir. */
export default function CalculosSalvos({ calculos, abertoId }: { calculos: CalculoResumo[]; abertoId?: string }) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState<CalculoResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");

  async function confirmarExclusao() {
    if (!excluindo) return;
    const alvo = excluindo;
    setExcluindo(null);
    setErro(null);
    const resposta = await fetch(`/api/admin/calculos-preco/${alvo.id}`, { method: "DELETE" });
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      setErro(dados.erro ?? `Erro ${resposta.status} ao excluir.`);
      return;
    }
    setMarcados((atual) => {
      const novo = new Set(atual);
      novo.delete(alvo.id);
      return novo;
    });
    if (alvo.id === abertoId) router.push("/admin/produtos/calculadora");
    router.refresh();
  }

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  if (calculos.length === 0) return null;

  // Ordem da lista, não a ordem em que foram marcados.
  const idsMarcados = calculos.filter((c) => marcados.has(c.id)).map((c) => c.id);
  // "Marcar todos" vale para o que a busca mostra; marcados escondidos continuam marcados.
  const visiveis = calculos.filter((c) => combinaBusca(busca, c.nome, c.alturaCm && `${c.alturaCm} cm`));
  const todosMarcados = visiveis.length > 0 && visiveis.every((c) => marcados.has(c.id));

  function alternarVisiveis() {
    setMarcados((atual) => {
      const novo = new Set(atual);
      for (const c of visiveis) {
        if (todosMarcados) novo.delete(c.id);
        else novo.add(c.id);
      }
      return novo;
    });
  }

  return (
    <details className={calc.salvos} open={!abertoId}>
      <summary>Cálculos salvos ({calculos.length})</summary>
      <div className={calc.buscaSalvos}>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setBusca("")}
          placeholder="Buscar cálculo pelo nome…"
          aria-label="Buscar cálculo salvo"
        />
        {busca.trim() !== "" && (
          <span className={styles.mlLinkAviso}>
            {visiveis.length} de {calculos.length}
          </span>
        )}
      </div>
      <div className={calc.barraImpressao}>
        <label className={calc.checkFaixaCurto}>
          <input
            type="checkbox"
            checked={todosMarcados}
            onChange={alternarVisiveis}
          />
          Marcar todos
        </label>
        {idsMarcados.length > 0 ? (
          <Link
            href={`/admin/produtos/calculadora/imprimir?ids=${idsMarcados.join(",")}`}
            target="_blank"
            className={styles.btnPrimary}
          >
            Imprimir selecionados ({idsMarcados.length})
          </Link>
        ) : (
          <span className={styles.mlLinkAviso}>Marque os cálculos para imprimir e mostrar aos sócios.</span>
        )}
      </div>
      <ul>
        {visiveis.length === 0 && <li className={styles.mlLinkAviso}>Nenhum cálculo com “{busca.trim()}”.</li>}
        {visiveis.map((c) => (
          <li key={c.id} className={c.id === abertoId ? calc.salvoAberto : undefined}>
            <input
              type="checkbox"
              className={calc.marcarSalvo}
              checked={marcados.has(c.id)}
              onChange={() => alternar(c.id)}
              aria-label={`Marcar ${c.nome} para imprimir`}
            />
            <Link href={`/admin/produtos/calculadora?id=${c.id}`}>{c.nome}</Link>
            {c.alturaCm && <span className={calc.alturaSalvo}>{c.alturaCm.replace(".", ",")} cm</span>}
            <span className={styles.mlLinkAviso}>
              {new Date(c.atualizadoEm).toLocaleDateString("pt-BR")}
              {c.virouProduto && " · já virou produto"}
            </span>
            <button type="button" className={calc.excluir} onClick={() => setExcluindo(c)}>
              Excluir
            </button>
          </li>
        ))}
      </ul>
      {erro && <span className={styles.fieldError}>{erro}</span>}
      <ConfirmModal
        aberto={excluindo !== null}
        titulo="Excluir cálculo"
        mensagem={`Excluir o cálculo "${excluindo?.nome ?? ""}"? O produto criado a partir dele, se houver, continua existindo.`}
        textoConfirmar="Excluir"
        variante="perigo"
        onConfirmar={confirmarExclusao}
        onCancelar={() => setExcluindo(null)}
      />
    </details>
  );
}
