"use client";

import type { ReactNode } from "react";
import styles from "../admin.module.css";
import calc from "../calculadoraRapida.module.css";
import { soNumero } from "./formato";

/** Campo numérico curto: rótulo, valor e unidade grudada (R$ à esquerda, %/h/g à direita). */
export function Campo({
  id,
  rotulo,
  unidade,
  prefixo,
  valor,
  onChange,
  dica,
  desabilitado,
  placeholder,
}: {
  id: string;
  rotulo: string;
  unidade?: string;
  prefixo?: string;
  valor: string;
  onChange: (valor: string) => void;
  dica?: ReactNode;
  desabilitado?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{rotulo}</label>
      <div className={`${calc.campoUnidade} ${desabilitado ? calc.campoDesabilitado : ""}`}>
        {prefixo && <span className={calc.prefixo}>{prefixo}</span>}
        <input
          id={id}
          inputMode="decimal"
          value={valor}
          disabled={desabilitado}
          placeholder={placeholder}
          onChange={(e) => onChange(soNumero(e.target.value))}
        />
        {unidade && <span>{unidade}</span>}
      </div>
      {dica && <span className={styles.mlLinkAviso}>{dica}</span>}
    </div>
  );
}

/** Opções em cartões (escolha única): título + linha de apoio, a escolhida destacada. */
export function Opcoes<T extends string>({
  rotulo,
  valor,
  opcoes,
  onChange,
  colunas,
}: {
  rotulo?: string;
  valor: T;
  opcoes: Array<{ valor: T; titulo: string; apoio?: string }>;
  onChange: (valor: T) => void;
  colunas?: number;
}) {
  return (
    <div className={styles.field}>
      {rotulo && <span className={calc.rotuloGrupo}>{rotulo}</span>}
      <div
        className={calc.cartoesOpcao}
        role="radiogroup"
        aria-label={rotulo}
        style={{ gridTemplateColumns: `repeat(${colunas ?? opcoes.length}, minmax(0, 1fr))` }}
      >
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={valor === o.valor}
            className={valor === o.valor ? calc.cartaoOpcaoAtivo : calc.cartaoOpcao}
            onClick={() => onChange(o.valor)}
          >
            <strong>{o.titulo}</strong>
            {o.apoio && <span>{o.apoio}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Linha com interruptor (liga/desliga) e explicação. */
export function Interruptor({
  id,
  titulo,
  apoio,
  ligado,
  onChange,
  children,
}: {
  id: string;
  titulo: string;
  apoio?: string;
  ligado: boolean;
  onChange: (ligado: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className={calc.interruptorBloco}>
      <label htmlFor={id} className={calc.interruptor}>
        <span>
          <strong>{titulo}</strong>
          {apoio && <small>{apoio}</small>}
        </span>
        <input id={id} type="checkbox" role="switch" checked={ligado} onChange={(e) => onChange(e.target.checked)} />
      </label>
      {ligado && children && <div className={calc.interruptorConteudo}>{children}</div>}
    </div>
  );
}

/** Divisor com rótulo no meio ("FILAMENTO", "FRETE"…). */
export function Divisor({ children }: { children: ReactNode }) {
  return <div className={calc.divisor}>{children}</div>;
}
