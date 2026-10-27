"use client";

import { useState } from "react";
import styles from "./admin.module.css";
import { descontoMaximoNoPiso, simularDesconto, type VerbaDesconto as Verba } from "@/lib/produtos/verbaDesconto";

function reais(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2)}`;
}

function porcento(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/**
 * Verba de desconto de um canal (spec 034): margem − piso = verba; o cupom de
 * loja sai primeiro e o resto é a sobra livre para promoção relâmpago, cupom
 * do produto etc. Com `lucroEm`, mostra também o simulador de desconto.
 */
export default function VerbaDesconto({
  verba,
  lucroEm,
  idCampo,
}: {
  verba: Verba;
  /** Lucro em centavos num preço — o mesmo usado para montar a verba. */
  lucroEm: (precoCentavos: number) => number;
  /** Id único do campo do simulador (um por canal na mesma tela). */
  idCampo: string;
}) {
  const [descontoTexto, setDescontoTexto] = useState("");
  const temCupomLoja = verba.cupomLojaCentavos > 0;

  const descontoDigitado = descontoTexto.trim() !== "";
  const simulacao = descontoDigitado
    ? simularDesconto(verba, Number(descontoTexto.trim().replace(",", ".")), lucroEm)
    : null;

  // Desconto máximo de verdade (taxas recalculadas no preço pago), não a regra simples da verba.
  const maximo = descontoMaximoNoPiso(verba, lucroEm);

  return (
    <div className={styles.field}>
      <strong>Estratégia de preço e descontos</strong>
      <ol className={styles.estrategia}>
        <li>
          <span>
            Digite <strong className={styles.estrategiaValor}>{reais(verba.precoCentavos)}</strong> no preço do produto
          </span>
          <small>
            É o preço cheio do anúncio. Sem desconto, você ganha {reais(verba.lucroCentavos)} (
            {porcento(verba.margemPercentual)}).
          </small>
        </li>
        {temCupomLoja && (
          <li>
            <span>
              Cupom de loja: <strong className={styles.estrategiaValor}>{porcento(verba.cupomLojaPercentual)}</strong>
            </span>
            <small>Vale para todos os produtos; aqui desconta {reais(verba.cupomLojaCentavos)}.</small>
          </li>
        )}
        {maximo ? (
          <li>
            <span>
              Desconto no produto: até{" "}
              <strong className={styles.estrategiaValor}>{porcento(maximo.descontoPercentual)}</strong>
            </span>
            <small>
              Na promoção relâmpago, promoção de desconto ou cupom do produto
              {temCupomLoja ? ", somado ao cupom de loja" : ""}. No máximo, o cliente paga{" "}
              {reais(maximo.precoFinalCentavos)} e você ganha {reais(maximo.lucroCentavos)} (
              {porcento(maximo.margemPercentual)}), o piso.
            </small>
          </li>
        ) : (
          <li>
            <span className={styles.fieldError}>
              {verba.estado === "abaixoDoPiso"
                ? `⚠ Este preço já está abaixo do piso de ${porcento(verba.pisoPercentual)}: suba o preço antes de dar desconto.`
                : `⚠ Com o cupom de loja o lucro já fica abaixo do piso de ${porcento(verba.pisoPercentual)}: suba o preço para ter espaço para descontos.`}
            </span>
          </li>
        )}
      </ol>

      {maximo && (
        <div className={styles.estrategiaFinal}>
          <span>Valor final para o cliente</span>
          <strong>{reais(maximo.precoFinalCentavos)}</strong>
          <small>
            de <s>{reais(verba.precoCentavos)}</s> · você ganha {reais(maximo.lucroCentavos)} (
            {porcento(maximo.margemPercentual)})
          </small>
        </div>
      )}

      <details className={styles.estrategiaRegra}>
        <summary>Regra simples da verba (mais conservadora)</summary>
        <span className={styles.mlLinkAviso}>
          Margem {porcento(verba.margemPercentual)} − piso {porcento(verba.pisoPercentual)}
          {temCupomLoja ? ` − cupom de loja ${porcento(verba.cupomLojaPercentual)}` : ""} ={" "}
          {porcento(verba.sobraPercentual)} de sobra. Não considera que a comissão também cai com o desconto.
        </span>
      </details>

      <label htmlFor={idCampo}>Simular desconto (%)</label>
      <input
        id={idCampo}
        inputMode="decimal"
        placeholder={`Ex: ${Math.floor(maximo?.descontoPercentual ?? 0)}`}
        value={descontoTexto}
        onChange={(e) => setDescontoTexto(e.target.value)}
      />
      {descontoDigitado && simulacao === null && (
        <span className={styles.fieldError}>Informe um desconto entre 0 e menos de 100%.</span>
      )}
      {simulacao && (
        <span className={simulacao.abaixoDoPiso ? styles.fieldError : styles.mlLinkAviso}>
          Cliente paga {reais(simulacao.precoFinalCentavos)}
          {temCupomLoja ? " (com o cupom de loja)" : ""} · seu lucro: {reais(simulacao.lucroCentavos)} (
          {porcento(simulacao.margemPercentual)} do preço pago)
          {simulacao.abaixoDoPiso
            ? ` — ⚠ abaixo do piso de ${porcento(verba.pisoPercentual)}.`
            : " — ✔ no piso ou acima."}
        </span>
      )}
    </div>
  );
}
