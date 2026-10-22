"use client";

import { useState } from "react";
import styles from "./admin.module.css";
import { simularDesconto, type VerbaDesconto as Verba } from "@/lib/produtos/verbaDesconto";

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

  return (
    <div className={styles.field}>
      <strong>Verba de desconto (cupons e promoções)</strong>
      <span className={styles.mlLinkAviso}>
        Margem atual {porcento(verba.margemPercentual)} do preço ({reais(verba.lucroCentavos)} de lucro) − piso{" "}
        {porcento(verba.pisoPercentual)} = <strong>verba de {porcento(verba.verbaPercentual)}</strong>
      </span>
      {temCupomLoja && (
        <span className={styles.mlLinkAviso}>
          − Cupom de loja: {porcento(verba.cupomLojaPercentual)} ({reais(verba.cupomLojaCentavos)})
        </span>
      )}

      {verba.estado === "abaixoDoPiso" ? (
        <span className={styles.fieldError}>
          ⚠ Este preço já está abaixo do piso de {porcento(verba.pisoPercentual)}: não dê desconto nem entre em
          promoção sem subir o preço.
        </span>
      ) : verba.estado === "semCupomLoja" ? (
        <span className={styles.fieldError}>
          ⚠ A verba não cobre nem o cupom de loja: com ele, o lucro fica abaixo do piso. Suba o preço para ter
          espaço para cupons.
        </span>
      ) : (
        <span>
          = <strong>Sobra livre: {porcento(verba.sobraPercentual)} ({reais(verba.sobraCentavos)})</strong> para
          promoção relâmpago, cupom do produto etc. Até esse desconto você continua ganhando pelo menos o piso.
        </span>
      )}

      <label htmlFor={idCampo}>Simular desconto (%)</label>
      <input
        id={idCampo}
        inputMode="decimal"
        placeholder={`Ex: ${Math.max(0, Math.floor(verba.sobraPercentual))}`}
        value={descontoTexto}
        onChange={(e) => setDescontoTexto(e.target.value)}
      />
      {descontoDigitado && simulacao === null && (
        <span className={styles.fieldError}>Informe um desconto entre 0 e menos de 100%.</span>
      )}
      {simulacao && (
        <span className={simulacao.passouDaSobra || simulacao.abaixoDoPiso ? styles.fieldError : styles.mlLinkAviso}>
          Cliente paga {reais(simulacao.precoFinalCentavos)}
          {temCupomLoja ? " (com o cupom de loja)" : ""} · seu lucro: {reais(simulacao.lucroCentavos)} (
          {porcento(simulacao.margemPercentual)} do preço pago)
          {simulacao.abaixoDoPiso
            ? ` — ⚠ abaixo do piso de ${porcento(verba.pisoPercentual)}.`
            : simulacao.passouDaSobra
              ? " — ⚠ passa da sobra: pela regra da verba, recuse."
              : " — ✔ dentro da verba."}
        </span>
      )}
    </div>
  );
}
