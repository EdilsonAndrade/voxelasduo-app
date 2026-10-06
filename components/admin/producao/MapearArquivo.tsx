"use client";

import { useState } from "react";
import FotoPlaca from "./FotoPlaca";
import DetalhePlaca from "./DetalhePlaca";
import { PARTE_PECA_UNICA } from "@/lib/models/producao";
import styles from "./producao.module.css";

/** Valor interno do item "outra parte…" — nunca é gravado. */
const NOVA_PARTE = "__nova__";

export interface ProdutoOpcao {
  id: string;
  nome: string;
}

export interface Pendente {
  nomeArquivo: string;
  titulo?: string;
  nomePerfil?: string;
  nomePlaca?: string;
  designId?: string;
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
 * um produto inteiro numa placa não precisa pensar em partes. Quando o produto
 * é montado de vários arquivos, a parte vira uma lista com o que já foi
 * nomeado naquele produto — digitar o nome de novo, e errando uma letra,
 * criaria uma parte duplicada.
 */
export default function MapearArquivo({
  pendentes,
  produtos,
  partesPorProduto,
  onMapeado,
}: {
  pendentes: Pendente[];
  produtos: ProdutoOpcao[];
  /** Partes já nomeadas em cada produto, para a lista do campo "Parte". */
  partesPorProduto: Record<string, string[]>;
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
          partesPorProduto={partesPorProduto}
          onMapeado={onMapeado}
        />
      ))}
    </section>
  );
}

function LinhaPendente({
  pendente,
  produtos,
  partesPorProduto,
  onMapeado,
}: {
  pendente: Pendente;
  produtos: ProdutoOpcao[];
  partesPorProduto: Record<string, string[]>;
  onMapeado: () => void;
}) {
  const [produtoId, setProdutoId] = useState("");
  const [parte, setParte] = useState(PARTE_PECA_UNICA);
  // Só aparece quando a parte ainda não existe no produto: é o "outra parte…".
  const [nomeandoParte, setNomeandoParte] = useState(false);
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
          parte: parte.trim(),
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

  // Peça única sempre primeiro: é o caso mais comum e o padrão do campo.
  const partesDoProduto = partesPorProduto[produtoId] ?? [];
  const opcoesDeParte = [
    PARTE_PECA_UNICA,
    ...partesDoProduto.filter((p) => p !== PARTE_PECA_UNICA),
  ];

  return (
    <div className={styles.pendente}>
      {/*
        A miniatura da impressão mais recente deste nome: muitos títulos vêm
        do perfil de fatiamento ("0.2mm layer, 2 walls...") e não dizem nada
        sobre a peça — a foto da placa é o que permite reconhecê-la.
      */}
      <FotoPlaca
        url={pendente.coverUrl}
        nome={pendente.titulo ?? pendente.nomeArquivo}
        className={styles.miniaturaPendente}
        classNameVazio={styles.semMiniaturaPendente}
      />

      <div className={styles.pendenteNome}>
        <div className={styles.nomeArquivo}>{pendente.titulo ?? pendente.nomeArquivo}</div>
        <DetalhePlaca
          nomePlaca={pendente.nomePlaca}
          nomePerfil={pendente.nomePerfil}
          designId={pendente.designId}
        />
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
          onChange={(e) => {
            setProdutoId(e.target.value);
            // Partes são por produto: ao trocar, volta ao padrão em vez de
            // levar junto o nome de uma parte de outro produto.
            setParte(PARTE_PECA_UNICA);
            setNomeandoParte(false);
          }}
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
        {nomeandoParte ? (
          <input
            className={styles.entrada}
            value={parte}
            onChange={(e) => setParte(e.target.value)}
            placeholder="ex.: Base, Corpo, Tampa"
            autoFocus
          />
        ) : (
          <select
            className={styles.entrada}
            value={parte}
            onChange={(e) => {
              if (e.target.value === NOVA_PARTE) {
                setParte("");
                setNomeandoParte(true);
                return;
              }
              setParte(e.target.value);
            }}
          >
            {opcoesDeParte.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
            <option value={NOVA_PARTE}>outra parte…</option>
          </select>
        )}
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
        disabled={enviando || !produtoId || parte.trim() === ""}
      >
        Salvar
      </button>

      {erro && <p className={styles.erro}>{erro}</p>}
    </div>
  );
}
