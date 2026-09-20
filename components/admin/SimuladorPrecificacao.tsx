"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";
import type { ComissaoMercadoLivre } from "@/lib/produtos/precificacao";
import { calcularPrecoEscala, calcularPrecoSugerido, calcularSimulacaoPrecificacao } from "@/lib/produtos/precificacao";

/** Espera após a última tecla digitada no preço antes de consultar a comissão real (FR-005, research.md #5). */
const DEBOUNCE_MS = 500;

/** Margem mínima padrão sugerida quando o vendedor ainda não configurou a própria (FR-010). */
const MARGEM_MINIMA_PADRAO = "20";

/** Margem de lucro desejada padrão, usada só para calcular o preço sugerido (mesmo valor de exemplo da planilha do solicitante). */
const MARGEM_DESEJADA_PADRAO = "100";

/** "completo" cobre depreciação e mão de obra; "escala" cobre só o custo de caixa (vender sem perda usando a impressora ociosa). */
type ModoPreco = "completo" | "escala";

function paraCentavos(valorReais: number): number {
  return Math.round(valorReais * 100);
}

function precoValido(precoReais: string): number | null {
  const numero = Number(precoReais.trim().replace(",", "."));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export interface SimuladorPrecificacaoProps {
  nome: string;
  categoria: string;
  /** Mesmo valor do campo "Preço (R$)" do produto — a simulação reage a esse preço, não a um campo separado. */
  precoVendaReais: string;
  /** Custo de produção total (COGS), em centavos — `null` quando o custo de produção (US1) ainda está incompleto. */
  cogsCentavos: number | null;
  /** Custo de caixa (COGS sem depreciação e mão de obra), em centavos — base do "preço de escala". */
  custoCaixaCentavos: number | null;
  /** Depreciação da impressora embutida nesta peça, em centavos — referência de quanto o preço de escala deixa de recuperar. */
  depreciacaoCentavos: number | null;
  /** Tempo de impressão da peça, em horas — usado para mostrar o lucro de caixa por hora de impressora. */
  tempoImpressaoHoras: number | null;
  /** Chamado quando o vendedor clica em "Usar esse preço" no preço sugerido, com o valor pronto para o campo "Preço (R$)". */
  onAplicarPrecoSugerido?: (precoReais: string) => void;
}

export default function SimuladorPrecificacao({
  nome,
  categoria,
  precoVendaReais,
  cogsCentavos,
  custoCaixaCentavos,
  depreciacaoCentavos,
  tempoImpressaoHoras,
  onAplicarPrecoSugerido,
}: SimuladorPrecificacaoProps) {
  const [comissao, setComissao] = useState<ComissaoMercadoLivre | null>(null);
  const [comissaoManualReais, setComissaoManualReais] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [margemMinimaPercentual, setMargemMinimaPercentual] = useState(MARGEM_MINIMA_PADRAO);
  const [margemDesejadaPercentual, setMargemDesejadaPercentual] = useState(MARGEM_DESEJADA_PADRAO);
  const [taxaEstimadaPercentual, setTaxaEstimadaPercentual] = useState("");
  const [lucroEscalaReais, setLucroEscalaReais] = useState("");
  const [modoPreco, setModoPreco] = useState<ModoPreco>("completo");
  const requisicaoAtual = useRef(0);

  // Pré-preenche a taxa estimada com a comissão real assim que ela for obtida
  // (mas só se o campo ainda estiver vazio, para não sobrescrever um valor
  // que o vendedor já tenha digitado manualmente).
  useEffect(() => {
    if (comissao && taxaEstimadaPercentual.trim() === "") {
      setTaxaEstimadaPercentual(String(comissao.percentageFee));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comissao]);

  const precoVendaCentavosOuNull = precoValido(precoVendaReais);

  useEffect(() => {
    // Preço inválido (vazio, zero, negativo ou não numérico) ou nome/categoria
    // ainda não preenchidos: não dispara consulta e limpa a simulação anterior (FR-012).
    if (precoVendaCentavosOuNull === null || !nome.trim() || !categoria.trim()) {
      setComissao(null);
      setErro(null);
      setCarregando(false);
      return;
    }

    const idRequisicao = ++requisicaoAtual.current;
    // Uma nova consulta automática (preço alterado) descarta a sobrescrita manual anterior (FR-007).
    setComissaoManualReais("");
    setCarregando(true);
    setErro(null);

    const timeout = setTimeout(async () => {
      try {
        const resposta = await fetch("/api/mercado-livre/simular-preco", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, categoria, precoReais: precoVendaCentavosOuNull }),
        });
        const dados = await resposta.json();

        if (idRequisicao !== requisicaoAtual.current) return; // resposta obsoleta, uma consulta mais nova já está em andamento

        if (!resposta.ok) {
          setComissao(null);
          setErro(dados.mensagem ?? "Não foi possível consultar a comissão no Mercado Livre.");
          return;
        }

        setComissao(dados as ComissaoMercadoLivre);
      } catch {
        if (idRequisicao !== requisicaoAtual.current) return;
        setComissao(null);
        setErro("Não foi possível consultar a comissão no Mercado Livre no momento.");
      } finally {
        if (idRequisicao === requisicaoAtual.current) setCarregando(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, categoria, precoVendaCentavosOuNull]);

  const comissaoManualCentavos =
    comissaoManualReais.trim() !== ""
      ? paraCentavos(Number(comissaoManualReais.replace(",", ".")) || 0)
      : null;
  const comissaoEfetivaCentavos = comissaoManualCentavos ?? comissao?.saleFeeAmountCentavos ?? null;

  const margemMinimaNumero = Number(margemMinimaPercentual.replace(",", ".")) || 0;

  const margemDesejadaNumero = Number(margemDesejadaPercentual.replace(",", "."));
  const taxaEstimadaNumero = Number(taxaEstimadaPercentual.replace(",", "."));
  const custoBaseCentavos = modoPreco === "escala" ? custoCaixaCentavos : cogsCentavos;
  const taxaValida = Number.isFinite(taxaEstimadaNumero) && taxaEstimadaNumero >= 0;
  const lucroEscalaNumero = Number(lucroEscalaReais.replace(",", "."));
  const lucroEscalaValido =
    lucroEscalaReais.trim() !== "" && Number.isFinite(lucroEscalaNumero) && lucroEscalaNumero >= 0;
  let precoSugeridoCentavos: number | null = null;
  if (custoBaseCentavos !== null && taxaValida) {
    if (modoPreco === "escala") {
      if (lucroEscalaValido) {
        precoSugeridoCentavos = calcularPrecoEscala(
          custoBaseCentavos,
          paraCentavos(lucroEscalaNumero),
          taxaEstimadaNumero
        );
      }
    } else if (Number.isFinite(margemDesejadaNumero) && margemDesejadaNumero >= 0) {
      precoSugeridoCentavos = calcularPrecoSugerido(
        custoBaseCentavos,
        margemDesejadaNumero,
        taxaEstimadaNumero
      );
    }
  }

  const simulacao =
    cogsCentavos !== null && comissaoEfetivaCentavos !== null && precoVendaCentavosOuNull !== null
      ? calcularSimulacaoPrecificacao(
          cogsCentavos,
          comissaoEfetivaCentavos,
          paraCentavos(precoVendaCentavosOuNull),
          margemMinimaNumero
        )
      : null;

  const lucroCaixaCentavos =
    custoCaixaCentavos !== null && comissaoEfetivaCentavos !== null && precoVendaCentavosOuNull !== null
      ? paraCentavos(precoVendaCentavosOuNull) - custoCaixaCentavos - comissaoEfetivaCentavos
      : null;
  const lucroCaixaPorHoraCentavos =
    lucroCaixaCentavos !== null && tempoImpressaoHoras !== null && tempoImpressaoHoras > 0
      ? lucroCaixaCentavos / tempoImpressaoHoras
      : null;
  // Prejuízo "real" (não cobre nem o custo de caixa) é diferente de só não cobrir a depreciação.
  const prejuizoDeCaixa = lucroCaixaCentavos !== null && lucroCaixaCentavos < 0;

  return (
    <div className={styles.field}>
      <label>Preço de venda sugerido</label>
      {cogsCentavos === null ? (
        <span className={styles.mlLinkAviso}>
          Preencha o custo de produção acima para ver um preço de venda sugerido.
        </span>
      ) : (
        <>
          <div className={styles.row}>
            <button
              type="button"
              className={modoPreco === "completo" ? styles.btnPrimary : styles.btnGhost}
              aria-pressed={modoPreco === "completo"}
              onClick={() => setModoPreco("completo")}
            >
              Preço completo
            </button>
            <button
              type="button"
              className={modoPreco === "escala" ? styles.btnPrimary : styles.btnGhost}
              aria-pressed={modoPreco === "escala"}
              onClick={() => setModoPreco("escala")}
            >
              Preço de escala (sem perda)
            </button>
          </div>
          <span className={styles.mlLinkAviso}>
            {modoPreco === "completo"
              ? "Cobre todo o custo de produção, incluindo a depreciação da impressora e a mão de obra."
              : "Cobre só o que sai do bolso (filamento, energia e embalagem), sem depreciação nem mão de obra. Use para ganhar volume sem prejuízo de caixa."}
          </span>
          <div className={styles.row}>
            {modoPreco === "escala" ? (
              <div className={styles.field}>
                <label htmlFor="lucroEscala">Lucro desejado por peça (R$)</label>
                <input
                  id="lucroEscala"
                  inputMode="decimal"
                  placeholder="Ex: 3.00 (0 = sem perda)"
                  value={lucroEscalaReais}
                  onChange={(e) => setLucroEscalaReais(e.target.value)}
                />
              </div>
            ) : (
              <div className={styles.field}>
                <label htmlFor="margemDesejada">Margem de lucro desejada (%)</label>
                <input
                  id="margemDesejada"
                  inputMode="decimal"
                  value={margemDesejadaPercentual}
                  onChange={(e) => setMargemDesejadaPercentual(e.target.value)}
                />
              </div>
            )}
            <div className={styles.field}>
              <label htmlFor="taxaEstimada">Taxa estimada da plataforma (%)</label>
              <input
                id="taxaEstimada"
                inputMode="decimal"
                placeholder="Preenchida após consultar a comissão real"
                value={taxaEstimadaPercentual}
                onChange={(e) => setTaxaEstimadaPercentual(e.target.value)}
              />
            </div>
          </div>
          {precoSugeridoCentavos !== null ? (
            <div className={styles.mlLinkBox}>
              <strong>Preço sugerido: R$ {(precoSugeridoCentavos / 100).toFixed(2)}</strong>
              <span className={styles.mlLinkAviso}>
                Calculado a partir do {modoPreco === "escala" ? "custo de caixa" : "custo de produção"}{" "}
                (R$ {((custoBaseCentavos ?? 0) / 100).toFixed(2)}), d{modoPreco === "escala" ? "o lucro por peça" : "a margem desejada"} e da taxa estimada acima — ajuste a taxa conforme a comissão real for
                consultada abaixo para um valor mais preciso.
              </span>
              {modoPreco === "escala" && depreciacaoCentavos !== null && (
            <span className={styles.mlLinkAviso}>
              Atenção: cada peça consome R$ {(depreciacaoCentavos / 100).toFixed(2)} de vida útil da
              impressora. Um lucro por peça abaixo disso não paga a reposição dela — use o preço de
              escala só enquanto a impressora estaria parada.
            </span>
          )}
          {onAplicarPrecoSugerido && (
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => onAplicarPrecoSugerido((precoSugeridoCentavos / 100).toFixed(2))}
                >
                  Usar esse preço
                </button>
              )}
            </div>
          ) : (
            <span className={styles.mlLinkAviso}>
              {modoPreco === "escala"
                ? "Informe o lucro desejado por peça e a taxa estimada da plataforma (menor que 100%) para calcular o preço de escala."
                : "Informe a margem desejada e a taxa estimada da plataforma (menor que 100%) para calcular o preço sugerido."}
            </span>
          )}
        </>
      )}

      <label>Comissão do Mercado Livre</label>
      {precoVendaCentavosOuNull === null && (
        <span className={styles.mlLinkAviso}>
          Digite um preço de venda válido no campo &quot;Preço (R$)&quot; do produto para consultar a
          comissão real automaticamente.
        </span>
      )}
      {precoVendaCentavosOuNull !== null && (!nome.trim() || !categoria.trim()) && (
        <span className={styles.mlLinkAviso}>
          Preencha nome e categoria do produto para consultar a comissão real.
        </span>
      )}
      {precoVendaCentavosOuNull !== null && nome.trim() && categoria.trim() && carregando && (
        <span className={styles.mlLinkAviso}>Consultando comissão…</span>
      )}
      {precoVendaCentavosOuNull !== null &&
        nome.trim() &&
        categoria.trim() &&
        !carregando &&
        erro && (
          <span className={styles.fieldError}>
            {erro} Você pode preencher a comissão manualmente abaixo, ou seguir sem a simulação.
          </span>
        )}
      {precoVendaCentavosOuNull !== null &&
        nome.trim() &&
        categoria.trim() &&
        !carregando &&
        !erro &&
        comissao && (
          <span className={styles.mlLinkAviso}>
            Taxa de anúncio: R$ {(comissao.listingFeeAmountCentavos / 100).toFixed(2)} · Comissão de
            venda: R$ {(comissao.saleFeeAmountCentavos / 100).toFixed(2)} ({comissao.percentageFee}%)
          </span>
        )}

      <label htmlFor="comissaoManual">Ou informe a comissão manualmente (R$)</label>
      <input
        id="comissaoManual"
        inputMode="decimal"
        placeholder="Ex: 11.31"
        value={comissaoManualReais}
        onChange={(e) => setComissaoManualReais(e.target.value)}
      />

      <label htmlFor="margemMinima">Margem de lucro mínima aceitável (%)</label>
      <input
        id="margemMinima"
        inputMode="decimal"
        value={margemMinimaPercentual}
        onChange={(e) => setMargemMinimaPercentual(e.target.value)}
      />

      {precoVendaCentavosOuNull !== null &&
        cogsCentavos === null && (
          <span className={styles.mlLinkAviso}>
            Preencha o custo de produção acima para ver o lucro líquido e a margem.
          </span>
        )}
      {precoVendaCentavosOuNull !== null &&
        cogsCentavos !== null &&
        comissaoEfetivaCentavos === null &&
        !carregando &&
        !erro && (
          <span className={styles.mlLinkAviso}>
            Aguardando a comissão do Mercado Livre (ou informe-a manualmente acima) para calcular o
            lucro líquido.
          </span>
        )}

      {simulacao && (
        <div
          className={
            simulacao.prejuizo && prejuizoDeCaixa !== false
              ? styles.fieldError
              : simulacao.margemBaixa
                ? styles.mlLinkAviso
                : styles.mlLinkBox
          }
        >
          <strong>
            Lucro líquido estimado: R$ {(simulacao.lucroLiquidoCentavos / 100).toFixed(2)} (
            {simulacao.margemPercentual.toFixed(1)}% de margem)
          </strong>
          {simulacao.prejuizo && prejuizoDeCaixa !== false && (
            <div>⚠ Esse preço resulta em prejuízo.</div>
          )}
          {simulacao.prejuizo && prejuizoDeCaixa === false && (
            <div>
              ⚠ Não cobre a depreciação da impressora, mas cobre o custo de caixa (não sai dinheiro
              do bolso).
            </div>
          )}
          {!simulacao.prejuizo && simulacao.margemBaixa && (
            <div>⚠ Margem abaixo do mínimo configurado ({margemMinimaPercentual}%).</div>
          )}
        </div>
      )}
      {lucroCaixaCentavos !== null && (
        <span className={styles.mlLinkAviso}>
          Lucro de caixa (sem depreciação e mão de obra): R$ {(lucroCaixaCentavos / 100).toFixed(2)}
          {lucroCaixaPorHoraCentavos !== null &&
            ` · R$ ${(lucroCaixaPorHoraCentavos / 100).toFixed(2)} por hora de impressora`}
        </span>
      )}
    </div>
  );
}
