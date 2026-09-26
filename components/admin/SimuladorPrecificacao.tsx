"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";
import type { ComissaoMercadoLivre } from "@/lib/produtos/precificacao";
import { calcularPrecoEscala, calcularPrecoSugerido, calcularSimulacaoPrecificacao } from "@/lib/produtos/precificacao";
import {
  calcularComparativoCanais,
  calcularPrecoMinimoCanal,
  calcularResultadoPisoCanal,
  type CanalVenda,
  type ResultadoCanal,
  type TaxasCanaisEfetivas,
} from "@/lib/produtos/canais";

const NOME_CANAL: Record<CanalVenda, string> = {
  mercadoLivre: "Mercado Livre",
  shopee: "Shopee",
  siteProprio: "Site próprio",
};

function formatarReais(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2)}`;
}

function descreverTaxa(taxa: { percentual: number; fixaCentavos: number }): string {
  return taxa.fixaCentavos > 0
    ? `${taxa.percentual}% + ${formatarReais(taxa.fixaCentavos)}`
    : `${taxa.percentual}%`;
}

/** Espera após a última tecla digitada no preço antes de consultar a comissão real (FR-005, research.md #5). */
const DEBOUNCE_MS = 500;

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
  /** Categoria do Mercado Livre já escolhida manualmente no admin, quando houver — evita depender só do previsor por nome (correção: EDI-108). */
  mercadoLivreCategoriaId?: string;
  /** Tipo de anúncio escolhido no admin ("gold_special" Clássico ou "gold_pro" Premium) — a consulta de comissão real usa esse tipo (correção: EDI-108, antes só considerava Clássico). */
  mercadoLivreTipoAnuncio?: "gold_special" | "gold_pro";
  /** Custo de produção total (COGS), em centavos — `null` quando o custo de produção (US1) ainda está incompleto. */
  cogsCentavos: number | null;
  /** Custo de caixa (COGS sem depreciação e mão de obra), em centavos — base do "preço de escala". */
  custoCaixaCentavos: number | null;
  /** Depreciação da impressora embutida nesta peça, em centavos — referência de quanto o preço de escala deixa de recuperar. */
  depreciacaoCentavos: number | null;
  /** Tempo de impressão da peça, em horas — usado para mostrar o lucro de caixa por hora de impressora. */
  tempoImpressaoHoras: number | null;
  /** Taxas efetivas de Shopee e site próprio (padrão global com override do produto aplicado) — EDI-106. */
  taxasCanais: TaxasCanaisEfetivas;
  /** Margem mínima efetiva (padrão global com override do produto já aplicado) — piso de segurança pra promoções (EDI-108). */
  margemMinimaPercentual: number;
  /** Margem de lucro desejada efetiva (padrão global com override do produto já aplicado) — usada pro "preço sugerido" (EDI-108, correção: antes era um campo solto que não persistia). */
  margemDesejadaPercentual: number;
  /** Preço de venda próprio de ML/Shopee, em centavos — ausente num canal = usa `precoVendaReais` (o preço do site) também nesse canal (EDI-108). */
  precosCanaisCentavos?: { mercadoLivre?: number; shopee?: number };
  /** Chamado quando o vendedor clica em "Usar esse preço" no preço sugerido (bloco geral, não por canal), com o valor pronto para o campo "Preço (R$)". */
  onAplicarPrecoSugerido?: (precoReais: string) => void;
  /** Chamado ao clicar em "Usar esse preço" dentro do card de um canal — o preço vai pro campo daquele canal específico (ML/Shopee têm campo próprio; site usa o preço único) (EDI-108). */
  onAplicarPrecoCanal?: (canal: CanalVenda, precoReais: string) => void;
}

const PREPOSICAO_CANAL: Record<CanalVenda, string> = {
  mercadoLivre: "no Mercado Livre",
  shopee: "na Shopee",
  siteProprio: "no site",
};

export default function SimuladorPrecificacao({
  nome,
  categoria,
  precoVendaReais,
  mercadoLivreCategoriaId,
  mercadoLivreTipoAnuncio,
  cogsCentavos,
  custoCaixaCentavos,
  depreciacaoCentavos,
  tempoImpressaoHoras,
  taxasCanais,
  margemMinimaPercentual,
  margemDesejadaPercentual,
  precosCanaisCentavos,
  onAplicarPrecoSugerido,
  onAplicarPrecoCanal,
}: SimuladorPrecificacaoProps) {
  const [comissao, setComissao] = useState<ComissaoMercadoLivre | null>(null);
  const [comissaoManualReais, setComissaoManualReais] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [taxaEstimadaPercentual, setTaxaEstimadaPercentual] = useState("");
  const [lucroEscalaReais, setLucroEscalaReais] = useState("");
  const [modoPreco, setModoPreco] = useState<ModoPreco>("completo");
  /** Custo extra de uma promoção específica (frete grátis, parcelamento, destaque etc.), por canal — livre, opcional (EDI-108). */
  const [custoExtraPorCanal, setCustoExtraPorCanal] = useState<Record<CanalVenda, string>>({
    mercadoLivre: "",
    shopee: "",
    siteProprio: "",
  });
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
          body: JSON.stringify({
            nome,
            categoria,
            precoReais: precoVendaCentavosOuNull,
            mercadoLivreCategoriaId,
            mercadoLivreTipoAnuncio,
          }),
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
  }, [nome, categoria, precoVendaCentavosOuNull, mercadoLivreCategoriaId, mercadoLivreTipoAnuncio]);

  const comissaoManualCentavos =
    comissaoManualReais.trim() !== ""
      ? paraCentavos(Number(comissaoManualReais.replace(",", ".")) || 0)
      : null;
  const comissaoEfetivaCentavos = comissaoManualCentavos ?? comissao?.saleFeeAmountCentavos ?? null;

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
    } else {
      precoSugeridoCentavos = calcularPrecoSugerido(
        custoBaseCentavos,
        margemDesejadaPercentual,
        taxaEstimadaNumero
      );
    }
  }

  // Comparativo por canal (EDI-106): mesmo custo/margem, cada canal com a própria taxa.
  const entradasComparativoValidas =
    custoBaseCentavos !== null && (modoPreco === "escala" ? lucroEscalaValido : true);
  const comparativo: ResultadoCanal[] | null =
    entradasComparativoValidas && custoBaseCentavos !== null
      ? calcularComparativoCanais({
          custoBaseCentavos,
          modo: modoPreco,
          margemDesejadaPercentual,
          lucroEscalaCentavos: lucroEscalaValido ? paraCentavos(lucroEscalaNumero) : 0,
          margemMinimaPercentual,
          mercadoLivre: { percentual: taxaValida ? taxaEstimadaNumero : 0, fixaCentavos: 0 },
          shopee: taxasCanais.shopee,
          siteProprio: taxasCanais.siteProprio,
        })
      : null;

  // "Preço atual" pro desconto máximo (EDI-108): o preço realmente praticado
  // hoje (campo "Preço (R$)"), não o preço sugerido hipotético acima — o
  // mesmo em todos os canais até cada um ter preço próprio (US2/T017).
  const precoAtualCentavos =
    precoVendaCentavosOuNull !== null ? paraCentavos(precoVendaCentavosOuNull) : null;

  const simulacao =
    cogsCentavos !== null && comissaoEfetivaCentavos !== null && precoVendaCentavosOuNull !== null
      ? calcularSimulacaoPrecificacao(
          cogsCentavos,
          comissaoEfetivaCentavos,
          paraCentavos(precoVendaCentavosOuNull),
          margemMinimaPercentual
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
                <label>Margem de lucro desejada</label>
                <span className={styles.comparativoPreco}>{margemDesejadaPercentual}%</span>
                <span className={styles.mlLinkAviso}>
                  Editável em "Taxas dos canais neste produto" (ou no padrão global, em Taxas dos
                  canais).
                </span>
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

          {comparativo && (
            <>
              <label>Comparativo por canal</label>
              <div className={styles.comparativoCanais}>
                {comparativo.map((resultado) => {
                  const semTaxaMl = resultado.canal === "mercadoLivre" && !taxaValida;
                  const classe =
                    resultado.prejuizo
                      ? styles.comparativoCanalPrejuizo
                      : resultado.margemBaixa
                        ? styles.comparativoCanalAviso
                        : styles.comparativoCanal;
                  return (
                    <div key={resultado.canal} className={classe}>
                      <strong>{NOME_CANAL[resultado.canal]}</strong>
                      {semTaxaMl ? (
                        <span className={styles.mlLinkAviso}>
                          Informe a taxa estimada da plataforma para ver o Mercado Livre.
                        </span>
                      ) : resultado.precoSugeridoCentavos === null ? (
                        <span className={styles.fieldError}>
                          Taxa inválida ({descreverTaxa(resultado.taxa)}): precisa ser menor que 100%.
                        </span>
                      ) : (
                        <>
                          <span className={styles.comparativoPreco}>
                            {formatarReais(resultado.precoSugeridoCentavos)}
                          </span>
                          <span className={styles.mlLinkAviso}>
                            − Taxa {NOME_CANAL[resultado.canal]} ({descreverTaxa(resultado.taxa)}):{" "}
                            {formatarReais(resultado.comissaoCentavos ?? 0)}
                          </span>
                          <span>
                            <strong>
                              = Você recebe: {formatarReais(
                                resultado.precoSugeridoCentavos - (resultado.comissaoCentavos ?? 0)
                              )}
                            </strong>
                          </span>
                          <span className={styles.mlLinkAviso}>
                            − Custo do produto: {formatarReais(
                              resultado.precoSugeridoCentavos -
                                (resultado.comissaoCentavos ?? 0) -
                                (resultado.lucroLiquidoCentavos ?? 0)
                            )}
                          </span>
                          <span>
                            <strong>
                              = Seu lucro: {formatarReais(resultado.lucroLiquidoCentavos ?? 0)} (
                              {(resultado.margemPercentual ?? 0).toFixed(0)}% sobre o custo)
                            </strong>
                          </span>
                          {resultado.prejuizo && <span>⚠ Resulta em prejuízo.</span>}
                          {!resultado.prejuizo && resultado.margemBaixa && (
                            <span>⚠ Lucro abaixo do mínimo ({margemMinimaPercentual}% sobre o custo).</span>
                          )}
                          {(onAplicarPrecoCanal ?? onAplicarPrecoSugerido) && (
                            <button
                              type="button"
                              className={styles.btnGhost}
                              onClick={() => {
                                const preco = (resultado.precoSugeridoCentavos! / 100).toFixed(2);
                                if (onAplicarPrecoCanal) onAplicarPrecoCanal(resultado.canal, preco);
                                else onAplicarPrecoSugerido!(preco);
                              }}
                            >
                              Usar esse preço {PREPOSICAO_CANAL[resultado.canal]}
                            </button>
                          )}
                          {(() => {
                            const custoExtraTexto = custoExtraPorCanal[resultado.canal];
                            const custoExtraCentavos =
                              custoExtraTexto.trim() !== ""
                                ? paraCentavos(Number(custoExtraTexto.replace(",", ".")) || 0)
                                : 0;
                            // Preço próprio do canal (EDI-108, US2), quando definido; senão o preço do site.
                            const precoAtualDoCanal =
                              resultado.canal === "mercadoLivre"
                                ? (precosCanaisCentavos?.mercadoLivre ?? precoAtualCentavos)
                                : resultado.canal === "shopee"
                                  ? (precosCanaisCentavos?.shopee ?? precoAtualCentavos)
                                  : precoAtualCentavos;
                            if (precoAtualDoCanal === null) return null;

                            const custo = custoBaseCentavos!;
                            const lucroMinimo = Math.round((custo * margemMinimaPercentual) / 100);
                            const comissaoEm = (preco: number) =>
                              Math.round((preco * resultado.taxa.percentual) / 100) + resultado.taxa.fixaCentavos;
                            // O custo extra (frete grátis etc.) sai do repasse, então soma ao custo do piso.
                            const precoMinimoCom = (extra: number) =>
                              calcularPrecoMinimoCanal(custo + extra, resultado.taxa, margemMinimaPercentual);

                            const recebeSemExtra = precoAtualDoCanal - comissaoEm(precoAtualDoCanal);
                            const extraMaximo = recebeSemExtra - custo - lucroMinimo;

                            const pisoDesconto = calcularResultadoPisoCanal(
                              resultado.canal,
                              precoAtualDoCanal,
                              precoMinimoCom(custoExtraCentavos)
                            );
                            const precoMinimo = pisoDesconto.precoMinimoCentavos;
                            const descontoOk = (pisoDesconto.descontoMaximoCentavos ?? -1) >= 0;

                            const recebeComExtra = recebeSemExtra - custoExtraCentavos;
                            const lucroComExtra = recebeComExtra - custo;
                            const extraCabe = custoExtraCentavos <= extraMaximo;
                            const textoExtra = custoExtraCentavos > 0 ? " com esse frete/custo extra" : "";

                            return (
                              <div className={styles.field}>
                                <strong>
                                  Promoções — seu lucro mínimo: {formatarReais(lucroMinimo)} (
                                  {margemMinimaPercentual}% sobre o custo)
                                </strong>
                                <span className={styles.mlLinkAviso}>
                                  Preço atual {PREPOSICAO_CANAL[resultado.canal]}:{" "}
                                  {formatarReais(precoAtualDoCanal)} · você recebe {formatarReais(recebeSemExtra)}
                                </span>

                                {extraMaximo >= 0 ? (
                                  <span>
                                    Frete grátis: nesse preço você aguenta pagar até{" "}
                                    <strong>{formatarReais(extraMaximo)}</strong> de frete (sem desconto no preço).
                                  </span>
                                ) : (
                                  <span className={styles.fieldError}>
                                    ⚠ O preço atual já não dá o seu lucro mínimo — não entre em promoção nem
                                    ofereça frete grátis sem subir o preço.
                                  </span>
                                )}

                                <label htmlFor={`custoExtra-${resultado.canal}`}>
                                  Quanto vai custar o frete grátis / custo extra? (R$, opcional)
                                </label>
                                <input
                                  id={`custoExtra-${resultado.canal}`}
                                  inputMode="decimal"
                                  placeholder="Ex: 12.95"
                                  value={custoExtraTexto}
                                  onChange={(e) =>
                                    setCustoExtraPorCanal((atual) => ({
                                      ...atual,
                                      [resultado.canal]: e.target.value,
                                    }))
                                  }
                                />

                                {custoExtraCentavos > 0 &&
                                  (extraCabe ? (
                                    <span className={styles.mlLinkAviso}>
                                      ✔ Cabe. Com {formatarReais(custoExtraCentavos)} de frete você recebe{" "}
                                      {formatarReais(recebeComExtra)} e seu lucro fica em{" "}
                                      {formatarReais(lucroComExtra)}.
                                    </span>
                                  ) : (
                                    <span className={styles.fieldError}>
                                      ⚠ Passa do limite em {formatarReais(custoExtraCentavos - Math.max(extraMaximo, 0))}.
                                      Nesse preço seu lucro cairia para {formatarReais(lucroComExtra)}.
                                      {precoMinimo !== null &&
                                        ` Para bancar esse frete e manter o lucro mínimo, o preço precisa ser pelo menos ${formatarReais(precoMinimo)}.`}
                                    </span>
                                  ))}

                                {descontoOk && precoMinimo !== null && (
                                  <span>
                                    Desconto: aceite promoções de até{" "}
                                    <strong>
                                      {pisoDesconto.descontoMaximoPercentual!.toFixed(1)}% (
                                      {formatarReais(pisoDesconto.descontoMaximoCentavos!)})
                                    </strong>
                                    {textoExtra}. Nesse limite o preço cai para {formatarReais(precoMinimo)} e seu
                                    lucro fica em {formatarReais(lucroMinimo)}. Desconto maior: recuse.
                                  </span>
                                )}

                                {!descontoOk && precoMinimo !== null && onAplicarPrecoCanal && (
                                  <button
                                    type="button"
                                    className={styles.btnGhost}
                                    onClick={() =>
                                      onAplicarPrecoCanal(resultado.canal, (precoMinimo / 100).toFixed(2))
                                    }
                                  >
                                    Subir o preço para {formatarReais(precoMinimo)}{" "}
                                    {PREPOSICAO_CANAL[resultado.canal]}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
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
            Você recebe: {formatarReais(simulacao.precoVendaCentavos - simulacao.comissaoCentavos)} · Seu
            lucro: {formatarReais(simulacao.lucroLiquidoCentavos)} ({simulacao.margemPercentual.toFixed(0)}%
            sobre o custo)
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
            <div>⚠ Lucro abaixo do mínimo configurado ({margemMinimaPercentual}% sobre o custo).</div>
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
