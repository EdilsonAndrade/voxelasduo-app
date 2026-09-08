"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";
import type { ComissaoMercadoLivre } from "@/lib/produtos/precificacao";
import { calcularPrecoSugerido, calcularSimulacaoPrecificacao } from "@/lib/produtos/precificacao";

/** Espera após a última tecla digitada no preço antes de consultar a comissão real (FR-005, research.md #5). */
const DEBOUNCE_MS = 500;

/** Margem mínima padrão sugerida quando o vendedor ainda não configurou a própria (FR-010). */
const MARGEM_MINIMA_PADRAO = "20";

/** Margem de lucro desejada padrão, usada só para calcular o preço sugerido (mesmo valor de exemplo da planilha do solicitante). */
const MARGEM_DESEJADA_PADRAO = "100";

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
  /** Chamado quando o vendedor clica em "Usar esse preço" no preço sugerido, com o valor pronto para o campo "Preço (R$)". */
  onAplicarPrecoSugerido?: (precoReais: string) => void;
}

export default function SimuladorPrecificacao({
  nome,
  categoria,
  precoVendaReais,
  cogsCentavos,
  onAplicarPrecoSugerido,
}: SimuladorPrecificacaoProps) {
  const [comissao, setComissao] = useState<ComissaoMercadoLivre | null>(null);
  const [comissaoManualReais, setComissaoManualReais] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [margemMinimaPercentual, setMargemMinimaPercentual] = useState(MARGEM_MINIMA_PADRAO);
  const [margemDesejadaPercentual, setMargemDesejadaPercentual] = useState(MARGEM_DESEJADA_PADRAO);
  const [taxaEstimadaPercentual, setTaxaEstimadaPercentual] = useState("");
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
  const precoSugeridoCentavos =
    cogsCentavos !== null &&
    Number.isFinite(margemDesejadaNumero) &&
    margemDesejadaNumero >= 0 &&
    Number.isFinite(taxaEstimadaNumero) &&
    taxaEstimadaNumero >= 0
      ? calcularPrecoSugerido(cogsCentavos, margemDesejadaNumero, taxaEstimadaNumero)
      : null;

  const simulacao =
    cogsCentavos !== null && comissaoEfetivaCentavos !== null && precoVendaCentavosOuNull !== null
      ? calcularSimulacaoPrecificacao(
          cogsCentavos,
          comissaoEfetivaCentavos,
          paraCentavos(precoVendaCentavosOuNull),
          margemMinimaNumero
        )
      : null;

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
            <div className={styles.field}>
              <label htmlFor="margemDesejada">Margem de lucro desejada (%)</label>
              <input
                id="margemDesejada"
                inputMode="decimal"
                value={margemDesejadaPercentual}
                onChange={(e) => setMargemDesejadaPercentual(e.target.value)}
              />
            </div>
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
                Calculado a partir do custo de produção (R$ {(cogsCentavos / 100).toFixed(2)}), da
                margem desejada e da taxa estimada acima — ajuste a taxa conforme a comissão real for
                consultada abaixo para um valor mais preciso.
              </span>
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
              Informe a margem desejada e a taxa estimada da plataforma (menor que 100%) para calcular
              o preço sugerido.
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
            simulacao.prejuizo
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
          {simulacao.prejuizo && <div>⚠ Esse preço resulta em prejuízo.</div>}
          {!simulacao.prejuizo && simulacao.margemBaixa && (
            <div>⚠ Margem abaixo do mínimo configurado ({margemMinimaPercentual}%).</div>
          )}
        </div>
      )}
    </div>
  );
}
