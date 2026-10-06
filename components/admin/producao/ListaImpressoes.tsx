"use client";

import { useState } from "react";
import FotoPlaca from "./FotoPlaca";
import DetalhePlaca from "./DetalhePlaca";
import styles from "./producao.module.css";
import type { ProdutoOpcao } from "./MapearArquivo";

export interface ImpressaoLista {
  id: string;
  nomeArquivo: string;
  titulo?: string;
  nomePerfil?: string;
  nomePlaca?: string;
  designId?: string;
  coverUrl?: string;
  resultado: "concluida" | "interrompida" | "em_andamento";
  inicio: string;
  duracaoSegundos?: number;
  gramas?: number;
  material?: string;
  impressoraNome?: string;
  historico: boolean;
  quantidadeLancada: number;
  quantidadePerdida: number;
  saldoLancavel: number;
  vinculo: {
    produtoId: string;
    produtoNome: string;
    parte: string;
    rendimentoPorPlaca: number;
    unidadesPorProduto: number;
  } | null;
}

export interface Filtros {
  resultado: string;
  vinculo: string;
  produtoId: string;
}

function horas(segundos?: number): string {
  if (!segundos) return "—";
  const h = Math.floor(segundos / 3600);
  const m = Math.round((segundos % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
}

/**
 * Histórico de impressões (US1) com o lançamento no estoque por linha (US4).
 *
 * Impressão histórica aparece esmaecida e **sem** ação de lançar: o estoque
 * atual já a reflete. Interrompida também não lança — não produziu peça.
 */
export default function ListaImpressoes({
  impressoes,
  total,
  produtos,
  filtros,
  onFiltros,
  onLancado,
}: {
  impressoes: ImpressaoLista[];
  total: number;
  produtos: ProdutoOpcao[];
  filtros: Filtros;
  onFiltros: (filtros: Filtros) => void;
  onLancado: () => void;
}) {
  return (
    <section className={styles.bloco}>
      <h2 className={styles.tituloBloco}>Impressões</h2>
      <p className={styles.subtituloBloco}>
        {total} {total === 1 ? "impressão importada" : "impressões importadas"}. A duração é a
        real, medida entre o início e o fim.
      </p>

      <div className={styles.filtros}>
        <label className={`${styles.campo} ${styles.campoCurto}`}>
          <span className={styles.rotulo}>Resultado</span>
          <select
            className={styles.entrada}
            value={filtros.resultado}
            onChange={(e) => onFiltros({ ...filtros, resultado: e.target.value })}
          >
            <option value="">todos</option>
            <option value="concluida">concluídas</option>
            <option value="interrompida">falhas</option>
            <option value="em_andamento">imprimindo</option>
          </select>
        </label>

        <label className={`${styles.campo} ${styles.campoCurto}`}>
          <span className={styles.rotulo}>Mapeamento</span>
          <select
            className={styles.entrada}
            value={filtros.vinculo}
            onChange={(e) => onFiltros({ ...filtros, vinculo: e.target.value })}
          >
            <option value="">todas</option>
            <option value="comVinculo">com produto</option>
            <option value="semVinculo">sem produto</option>
          </select>
        </label>

        <label className={styles.campo}>
          <span className={styles.rotulo}>Produto</span>
          <select
            className={styles.entrada}
            value={filtros.produtoId}
            onChange={(e) => onFiltros({ ...filtros, produtoId: e.target.value })}
          >
            <option value="">todos</option>
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {impressoes.length === 0 ? (
        <p className={styles.vazio}>Nenhuma impressão para estes filtros.</p>
      ) : (
        <div className={styles.rolagem}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Peça</th>
                <th>Arquivo e produto</th>
                <th>Resultado</th>
                <th>Quando</th>
                <th>Duração</th>
                <th>Filamento</th>
                <th>Impressora</th>
                <th>Estoque</th>
              </tr>
            </thead>
            <tbody>
              {impressoes.map((impressao) => (
                <Linha key={impressao.id} impressao={impressao} onLancado={onLancado} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Linha({
  impressao,
  onLancado,
}: {
  impressao: ImpressaoLista;
  onLancado: () => void;
}) {
  const [quantidade, setQuantidade] = useState(String(impressao.saldoLancavel));
  const [perda, setPerda] = useState("0");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function lancar() {
    setEnviando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/producao/lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId: impressao.vinculo!.produtoId,
          quantidade: Number(quantidade),
          quantidadePerdida: Number(perda),
        }),
      });
      const dados = await resposta.json().catch(() => ({}) as Record<string, string>);

      if (!resposta.ok) {
        setErro(dados.erro ?? `Falha ao lançar (HTTP ${resposta.status}).`);
        return;
      }
      onLancado();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao lançar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <tr className={impressao.historico ? styles.linhaHistorico : undefined}>
      <td data-rotulo="Peça">
        <FotoPlaca
          url={impressao.coverUrl}
          nome={impressao.titulo ?? impressao.nomeArquivo}
          className={styles.miniatura}
          classNameVazio={styles.semMiniatura}
        />
      </td>

      <td data-rotulo="Arquivo">
        <span className={styles.celulaNome}>
          <strong>{impressao.titulo ?? impressao.nomeArquivo}</strong>
          <DetalhePlaca
            nomePlaca={impressao.nomePlaca}
            nomePerfil={impressao.nomePerfil}
            designId={impressao.designId}
          />
          {impressao.vinculo ? (
            <span className={styles.produtoVinculado}>
              {impressao.vinculo.produtoNome} · {impressao.vinculo.parte} ·{" "}
              {impressao.vinculo.rendimentoPorPlaca} por placa
            </span>
          ) : (
            <span className={`${styles.selo} ${styles.seloSemVinculo}`}>sem produto</span>
          )}
        </span>
      </td>

      <td data-rotulo="Resultado">
        <span
          className={`${styles.selo} ${
            impressao.resultado === "concluida"
              ? styles.seloConcluida
              : impressao.resultado === "interrompida"
                ? styles.seloFalha
                : styles.seloAndamento
          }`}
        >
          {impressao.resultado === "concluida"
            ? "concluída"
            : impressao.resultado === "interrompida"
              ? "falhou"
              : "imprimindo"}
        </span>
        {impressao.historico && (
          <>
            {" "}
            <span className={`${styles.selo} ${styles.seloHistorico}`}>antes da conexão</span>
          </>
        )}
      </td>

      <td data-rotulo="Quando">{new Date(impressao.inicio).toLocaleString("pt-BR")}</td>
      <td data-rotulo="Duração">{horas(impressao.duracaoSegundos)}</td>

      <td data-rotulo="Filamento">
        {impressao.gramas ? `${Math.round(impressao.gramas)} g` : "—"}
        {impressao.material ? ` · ${impressao.material}` : ""}
      </td>

      <td data-rotulo="Impressora">{impressao.impressoraNome ?? "—"}</td>

      <td data-rotulo="Estoque">
        {impressao.quantidadeLancada > 0 && impressao.vinculo && (
          <div className={styles.pendenteDados}>
            lançado {impressao.quantidadeLancada} de {impressao.vinculo.rendimentoPorPlaca}
            {impressao.quantidadePerdida > 0 && ` · ${impressao.quantidadePerdida} perdida(s)`}
          </div>
        )}

        {impressao.saldoLancavel > 0 ? (
          <div className={styles.formLancar}>
            <label>
              <span className={styles.rotulo}>un.</span>
              <input
                className={styles.entradaQuantidade}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label>
              <span className={styles.rotulo}>perda</span>
              <input
                className={styles.entradaQuantidade}
                value={perda}
                onChange={(e) => setPerda(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <button
              type="button"
              className={styles.botaoLancar}
              onClick={lancar}
              disabled={enviando}
            >
              Lançar
            </button>
          </div>
        ) : (
          !impressao.quantidadeLancada && <span className={styles.pendenteDados}>—</span>
        )}

        {erro && <p className={styles.erro}>{erro}</p>}
      </td>
    </tr>
  );
}
