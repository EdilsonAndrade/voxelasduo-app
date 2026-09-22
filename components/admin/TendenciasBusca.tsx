"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./admin.module.css";

interface ItemRanking {
  posicao: number;
  id: string;
  tipo: "PRODUCT" | "ITEM" | "USER_PRODUCT";
  nome?: string;
}

interface TendenciaGeral {
  termo: string;
  url: string;
}

interface ResultadoBusca {
  termo: string;
  origem: "novo" | "cache";
  obtidoEm: string;
  avisoDesatualizado: boolean;
  categoriaId: string;
  categoriaNome?: string;
  ranking: ItemRanking[];
}

interface ResultadoGerais {
  origem: "novo" | "cache";
  obtidoEm: string;
  avisoDesatualizado: boolean;
  termos: TendenciaGeral[];
}

/** Mensagens por código de erro da rota (contracts/tendencias.md) — a mensagem do corpo tem prioridade quando presente. */
const MENSAGEM_ERRO: Record<string, string> = {
  termo_invalido: "Informe um termo para pesquisar.",
  categoria_nao_encontrada:
    "Não foi possível identificar uma categoria do Mercado Livre para este termo.",
  token_invalido: "Reconecte a conta do Mercado Livre para continuar.",
  falha_mercado_livre: "Não foi possível consultar o Mercado Livre no momento.",
};

function formatarObtidoEm(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Único fluxo de busca — usado tanto pelo campo livre quanto por um clique numa tendência geral (US2). */
export default function TendenciasBusca() {
  const [termo, setTermo] = useState("");
  const [campoErro, setCampoErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null);
  const [gerais, setGerais] = useState<ResultadoGerais | null>(null);

  const carregarTendenciasGerais = useCallback((forcar = false) => {
    const query = forcar ? "?forcar=true" : "";
    fetch(`/api/admin/tendencias/gerais${query}`)
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados) => {
        if (dados) setGerais(dados as ResultadoGerais);
      })
      .catch(() => {
        // Tendências gerais são um complemento — falha aqui não deve incomodar quem só quer pesquisar (US1).
      });
  }, []);

  useEffect(() => {
    // Tendências gerais carregam ao abrir a tela, independente de busca (US2).
    carregarTendenciasGerais();
  }, [carregarTendenciasGerais]);

  const pesquisar = useCallback(async (termoBusca: string, forcar = false) => {
    const valor = termoBusca.trim();
    if (!valor) {
      setCampoErro("Informe um termo para pesquisar.");
      return;
    }

    setCampoErro(null);
    setErro(null);
    setCarregando(true);

    try {
      const params = new URLSearchParams({ termo: valor });
      if (forcar) params.set("forcar", "true");
      const resposta = await fetch(`/api/admin/tendencias?${params.toString()}`);
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.mensagem ?? MENSAGEM_ERRO[dados.erro] ?? "Erro ao consultar tendências.");
        setResultado(null);
        return;
      }

      setResultado(dados as ResultadoBusca);
    } catch {
      setErro("Erro de conexão ao consultar o Mercado Livre.");
      setResultado(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  function aoSubmeter(evento: React.FormEvent) {
    evento.preventDefault();
    pesquisar(termo);
  }

  function aoClicarTendencia(termoClicado: string) {
    setTermo(termoClicado);
    pesquisar(termoClicado);
  }

  return (
    <div>
      {gerais && gerais.termos.length > 0 && (
        <div className={styles.field}>
          <label>
            Em alta no Mercado Livre agora — obtido em {formatarObtidoEm(gerais.obtidoEm)}
            {gerais.origem === "cache" ? " (cache)" : ""}
            {gerais.avisoDesatualizado && " — dados podem estar desatualizados"}
          </label>
          <div className={styles.actions}>
            {gerais.termos.map((tendencia) => (
              <button
                key={tendencia.termo}
                type="button"
                className={styles.btnGhost}
                onClick={() => aoClicarTendencia(tendencia.termo)}
              >
                {tendencia.termo}
              </button>
            ))}
            <button type="button" className={styles.btnGhost} onClick={() => carregarTendenciasGerais(true)}>
              Atualizar
            </button>
          </div>
        </div>
      )}

      <form className={styles.form} onSubmit={aoSubmeter}>
        <div className={styles.field}>
          <label htmlFor="termo-tendencia">Termo (ex.: &quot;chaveiro personalizado&quot;)</label>
          <input
            id="termo-tendencia"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Digite um termo para ver o que já vende"
          />
          {campoErro && <span className={styles.fieldError}>{campoErro}</span>}
        </div>
        <div className={styles.actions}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={carregando}>
            {carregando ? "Pesquisando..." : "Pesquisar"}
          </button>
        </div>
      </form>

      {erro && <p className={styles.formError}>{erro}</p>}

      {resultado && (
        <div>
          <p className={styles.avisoShopee}>
            Preço e link direto do anúncio não estão disponíveis — o Mercado Livre não libera esses
            dados por busca para este app. Abaixo, o ranking de mais vendido da categoria encontrada
            para &quot;{resultado.termo}&quot;.
          </p>

          <p>
            Categoria: {resultado.categoriaNome ?? resultado.categoriaId}
            {" — "}
            obtido em {formatarObtidoEm(resultado.obtidoEm)}
            {resultado.origem === "cache" ? " (cache)" : ""}
            {resultado.avisoDesatualizado && " — dados podem estar desatualizados"}
            {" "}
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => pesquisar(resultado.termo, true)}
              disabled={carregando}
            >
              Atualizar
            </button>
          </p>

          {resultado.ranking.length === 0 ? (
            <p className={styles.empty}>Nenhum destaque disponível para esta categoria.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Produto</th>
                </tr>
              </thead>
              <tbody>
                {resultado.ranking.map((item) => (
                  <tr key={item.id}>
                    <td>{item.posicao}º</td>
                    <td>{item.nome ?? "nome não disponível"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
