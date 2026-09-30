"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { gerarSlug } from "@/lib/produtos/slug";
import styles from "./admin.module.css";

export interface OpcaoSelectBusca {
  valor: string;
  rotulo: string;
}

/**
 * Seletor com busca (combobox) — abre a lista inteira para escolher direto,
 * ou filtra enquanto digita; setas, Enter e Esc funcionam (EDI-123). A busca
 * ignora acentos e maiúsculas ("decor" encontra "Decoração").
 */
export default function SelectBusca({
  id,
  opcoes,
  valor,
  onChange,
  placeholder = "Selecione",
  placeholderBusca = "Buscar…",
  compacto = false,
  desabilitado = false,
  rotuloAcessivel,
}: {
  id?: string;
  opcoes: OpcaoSelectBusca[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  placeholderBusca?: string;
  /** Versão menor, para caber em linhas de tabela. */
  compacto?: boolean;
  desabilitado?: boolean;
  rotuloAcessivel?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [ativo, setAtivo] = useState(0);
  const raizRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const listaId = useId();

  const filtradas = useMemo(() => {
    const busca = gerarSlug(termo);
    if (!busca) return opcoes;
    return opcoes.filter((o) => gerarSlug(o.rotulo).includes(busca));
  }, [opcoes, termo]);

  const escolhida = opcoes.find((o) => o.valor === valor);

  useEffect(() => {
    if (!aberto) return;
    function fecharAoClicarFora(evento: MouseEvent) {
      if (!raizRef.current?.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, [aberto]);

  function abrir() {
    setTermo("");
    setAtivo(Math.max(0, opcoes.findIndex((o) => o.valor === valor)));
    setAberto(true);
  }

  function selecionar(opcao: OpcaoSelectBusca) {
    setAberto(false);
    gatilhoRef.current?.focus();
    if (opcao.valor !== valor) onChange(opcao.valor);
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAtivo((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtivo((i) => Math.max(i - 1, 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      const opcao = filtradas[ativo];
      if (opcao) selecionar(opcao);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      setAberto(false);
      gatilhoRef.current?.focus();
    }
  }

  return (
    <div className={styles.catSelect} ref={raizRef}>
      <button
        ref={gatilhoRef}
        type="button"
        id={id}
        className={`${styles.catGatilho} ${compacto ? styles.catGatilhoCompacto : ""}`}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={rotuloAcessivel}
        disabled={desabilitado}
        onClick={() => (aberto ? setAberto(false) : abrir())}
      >
        {escolhida ? (
          <span className={styles.catEscolhida}>{escolhida.rotulo}</span>
        ) : (
          <span className={styles.catAutomatica}>{placeholder}</span>
        )}
        <span aria-hidden="true">▾</span>
      </button>

      {aberto && (
        <div className={`${styles.catPainel} ${compacto ? styles.catPainelCompacto : ""}`}>
          <input
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls={listaId}
            aria-activedescendant={filtradas[ativo] ? `${listaId}-${ativo}` : undefined}
            className={styles.catBusca}
            placeholder={placeholderBusca}
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setAtivo(0);
            }}
            onKeyDown={aoTeclar}
            autoFocus
          />

          {filtradas.length === 0 ? (
            <span className={styles.catVazio}>Nada encontrado para “{termo}”.</span>
          ) : (
            <ul className={styles.catLista} role="listbox" id={listaId}>
              {filtradas.map((opcao, indice) => (
                <li key={opcao.valor}>
                  <button
                    type="button"
                    role="option"
                    id={`${listaId}-${indice}`}
                    tabIndex={-1}
                    aria-selected={opcao.valor === valor}
                    className={`${styles.catItem} ${indice === ativo ? styles.catItemAtivo : ""}`}
                    onMouseEnter={() => setAtivo(indice)}
                    onClick={() => selecionar(opcao)}
                  >
                    <span>{opcao.rotulo}</span>
                    {opcao.valor === valor && <span aria-hidden="true">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
