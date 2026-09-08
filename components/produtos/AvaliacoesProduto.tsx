"use client";

import { useState } from "react";
import styles from "./produtos.module.css";

export interface AvaliacaoExibicao {
  canal: "site" | "mercado_livre" | "shopee";
  nota: number;
  comentario: string | null;
  dataAvaliacao: string;
}

const NOME_CANAL: Record<AvaliacaoExibicao["canal"], string> = {
  site: "Site",
  mercado_livre: "Mercado Livre",
  shopee: "Shopee",
};

interface AvaliacoesProdutoProps {
  produtoId: string;
  avaliacoesIniciais: AvaliacaoExibicao[];
  cursorInicial: string | null;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className={styles.avaliacaoNota} aria-label={`nota ${nota} de 5`}>
      {"★".repeat(nota)}
      {"☆".repeat(5 - nota)}
    </span>
  );
}

export default function AvaliacoesProduto({
  produtoId,
  avaliacoesIniciais,
  cursorInicial,
}: AvaliacoesProdutoProps) {
  const [avaliacoes, setAvaliacoes] = useState(avaliacoesIniciais);
  const [cursor, setCursor] = useState(cursorInicial);
  const [carregando, setCarregando] = useState(false);

  async function carregarMais() {
    if (!cursor || carregando) return;
    setCarregando(true);
    try {
      const resposta = await fetch(
        `/api/produtos/${produtoId}/avaliacoes?cursor=${encodeURIComponent(cursor)}`
      );
      const dados = (await resposta.json()) as {
        avaliacoes: AvaliacaoExibicao[];
        proximoCursor: string | null;
      };
      setAvaliacoes((atual) => [...atual, ...dados.avaliacoes]);
      setCursor(dados.proximoCursor);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className={styles.avaliacoes}>
      <h2 className={styles.avaliacoesTitulo}>avaliações de clientes</h2>

      {avaliacoes.length === 0 ? (
        <p className={styles.avaliacoesVazio}>Este produto ainda não tem avaliações.</p>
      ) : (
        <>
          <ul className={styles.avaliacoesLista}>
            {avaliacoes.map((avaliacao, indice) => (
              <li key={indice} className={styles.avaliacaoItem}>
                <div className={styles.avaliacaoCabecalho}>
                  <Estrelas nota={avaliacao.nota} />
                  <span className={styles.avaliacaoCanal}>{NOME_CANAL[avaliacao.canal]}</span>
                  <span className={styles.avaliacaoData}>
                    {formatarData(avaliacao.dataAvaliacao)}
                  </span>
                </div>
                {avaliacao.comentario && (
                  <p className={styles.avaliacaoComentario}>{avaliacao.comentario}</p>
                )}
              </li>
            ))}
          </ul>

          {cursor && (
            <button
              type="button"
              className={styles.avaliacoesCarregarMais}
              onClick={carregarMais}
              disabled={carregando}
            >
              {carregando ? "carregando…" : "carregar mais avaliações"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
