"use client";

import { useState } from "react";
import FotoPlaca from "./FotoPlaca";
import styles from "./producao.module.css";

export interface ProdutoOpcao {
  id: string;
  nome: string;
}

export interface Pendente {
  nomeArquivo: string;
  impressoes: number;
  gramasTotal: number;
  ultimaEm: string;
  coverUrl?: string;
}

/**
 * Fila de mapeamento (FR-012/FR-013). Para cada nome de arquivo o vendedor diz
 * de que produto é, que parte é, quantas saem por placa e quantas entram num
 * produto acabado — depois disso o nome nunca mais é perguntado.
 *
 * O padrão de "parte" é peça única, porque é o caso mais comum: quem imprime
 * um produto inteiro numa placa não precisa pensar em partes.
 */
export default function MapearArquivo({
  pendentes,
  produtos,
  onMapeado,
}: {
  pendentes: Pendente[];
  produtos: ProdutoOpcao[];
  onMapeado: () => void;
}) {
  if (pendentes.length === 0) return null;

  return (
    <section className={styles.blocoPendentes}>
      <h2 className={styles.tituloBloco}>Impressões sem produto</h2>
      <p className={styles.subtituloBloco}>
        Diga uma vez de que produto é cada arquivo. As impressões já importadas com esse nome
        passam a contar junto.
      </p>

      {pendentes.map((pendente) => (
        <LinhaPendente
          key={pendente.nomeArquivo}
          pendente={pendente}
          produtos={produtos}
          onMapeado={onMapeado}
        />
      ))}
    </section>
  );
}

function LinhaPendente({
  pendente,
  produtos,
  onMapeado,
}: {
  pendente: Pendente;
  produtos: ProdutoOpcao[];
  onMapeado: () => void;
}) {
  const [produtoId, setProdutoId] = useState("");
  const [parte, setParte] = useState("Peça única");
  const [rendimento, setRendimento] = useState("1");
  const [unidades, setUnidades] = useState("1");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    setEnviando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/producao/vinculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeArquivo: pendente.nomeArquivo,
          produtoId,
          parte,
          rendimentoPorPlaca: Number(rendimento),
          unidadesPorProduto: Number(unidades),
        }),
      });
      const dados = await resposta.json().catch(() => ({}) as Record<string, string>);

      if (!resposta.ok) {
        setErro(dados.erro ?? `Falha ao salvar (HTTP ${resposta.status}).`);
        return;
      }
      onMapeado();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.pendente}>
      {/*
        A miniatura da impressão mais recente deste nome: muitos títulos vêm
        do perfil de fatiamento ("0.2mm layer, 2 walls...") e não dizem nada
        sobre a peça — a foto da placa é o que permite reconhecê-la.
      */}
      <FotoPlaca
        url={pendente.coverUrl}
        nome={pendente.nomeArquivo}
        className={styles.miniaturaPendente}
        classNameVazio={styles.semMiniaturaPendente}
      />

      <div className={styles.pendenteNome}>
        <div className={styles.nomeArquivo}>{pendente.nomeArquivo}</div>
        <div className={styles.pendenteDados}>
          {pendente.impressoes} {pendente.impressoes === 1 ? "impressão" : "impressões"} ·{" "}
          {Math.round(pendente.gramasTotal)} g · última em{" "}
          {new Date(pendente.ultimaEm).toLocaleDateString("pt-BR")}
        </div>
      </div>

      <label className={styles.campo}>
        <span className={styles.rotulo}>Produto</span>
        <select
          className={styles.entrada}
          value={produtoId}
          onChange={(e) => setProdutoId(e.target.value)}
        >
          <option value="">selecione…</option>
          {produtos.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome}
            </option>
          ))}
        </select>
      </label>

      <label className={`${styles.campo} ${styles.campoCurto}`}>
        <span className={styles.rotulo}>Parte</span>
        <input
          className={styles.entrada}
          value={parte}
          onChange={(e) => setParte(e.target.value)}
          placeholder="Peça única"
        />
      </label>

      <label className={`${styles.campo} ${styles.campoCurto}`}>
        <span className={styles.rotulo}>Peças por placa</span>
        <input
          className={styles.entrada}
          value={rendimento}
          onChange={(e) => setRendimento(e.target.value)}
          inputMode="numeric"
        />
      </label>

      <label className={`${styles.campo} ${styles.campoCurto}`}>
        <span className={styles.rotulo}>Por produto</span>
        <input
          className={styles.entrada}
          value={unidades}
          onChange={(e) => setUnidades(e.target.value)}
          inputMode="numeric"
        />
      </label>

      <button
        type="button"
        className={styles.botao}
        onClick={salvar}
        disabled={enviando || !produtoId}
      >
        Salvar
      </button>

      {erro && <p className={styles.erro}>{erro}</p>}
    </div>
  );
}
