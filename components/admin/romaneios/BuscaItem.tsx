"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ROTULO_ORIGEM } from "@/lib/models/romaneio";
import type { OpcaoBuscaRomaneio } from "@/lib/romaneios/opcoes";
import { formatarPreco } from "@/lib/produtos/formato";
import { gerarSlug } from "@/lib/produtos/slug";
import styles from "./romaneios.module.css";

const LIMITE_SUGESTOES = 40;

export type EscolhaBusca = { opcao: OpcaoBuscaRomaneio } | { livre: string };

/**
 * Busca única do romaneio (specs/038): produtos e itens avulsos do Tempo de
 * Impressão na mesma lista, cada um com a etiqueta de origem. A última opção
 * adiciona o texto digitado como item livre. Ignora acentos e maiúsculas.
 */
export default function BuscaItem({ opcoes, onEscolher }: { opcoes: OpcaoBuscaRomaneio[]; onEscolher: (escolha: EscolhaBusca) => void }) {
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaId = useId();

  const filtradas = useMemo(() => {
    const busca = gerarSlug(termo);
    if (!busca) return [];
    return opcoes.filter((o) => gerarSlug(o.nome).includes(busca)).slice(0, LIMITE_SUGESTOES);
  }, [opcoes, termo]);

  const textoLivre = termo.trim();
  const total = filtradas.length + (textoLivre ? 1 : 0);

  function escolher(indice: number) {
    if (indice < filtradas.length) onEscolher({ opcao: filtradas[indice] });
    else if (textoLivre) onEscolher({ livre: textoLivre });
    else return;
    setTermo("");
    setAtivo(0);
    setAberto(false);
    inputRef.current?.focus();
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAberto(true);
      setAtivo((a) => Math.min(a + 1, Math.max(total - 1, 0)));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtivo((a) => Math.max(a - 1, 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      if (total > 0) escolher(ativo);
    } else if (evento.key === "Escape") {
      setAberto(false);
    }
  }

  const mostrar = aberto && textoLivre.length > 0;

  return (
    <div className={styles.busca}>
      <label className={styles.campo}>
        <span className={styles.rotulo}>Adicionar peça</span>
        <input
          ref={inputRef}
          className={styles.input}
          type="search"
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={mostrar && total > 0 ? `${listaId}-${ativo}` : undefined}
          placeholder="Buscar em Produtos e Tempo de impressão, ou digitar um item livre"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAtivo(0);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setAberto(false)}
          onKeyDown={aoTeclar}
        />
      </label>
      {mostrar && (
        <ul id={listaId} role="listbox" className={styles.buscaLista}>
          {filtradas.map((opcao, indice) => (
            <li
              key={`${opcao.origem}-${opcao.origemId}`}
              id={`${listaId}-${indice}`}
              role="option"
              aria-selected={indice === ativo}
              className={styles.buscaOpcao}
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(indice);
              }}
              onMouseEnter={() => setAtivo(indice)}
            >
              <span>
                {opcao.nome}
                <span className={`${styles.etiqueta} ${styles[`etiqueta_${opcao.origem}`]}`}>{ROTULO_ORIGEM[opcao.origem]}</span>
                {opcao.rascunho && <span className={styles.etiquetaRascunho}>rascunho</span>}
              </span>
              <span className={styles.buscaPreco}>{opcao.precoCentavos === null ? "sem preço" : formatarPreco(opcao.precoCentavos)}</span>
            </li>
          ))}
          {filtradas.length === 0 && <li className={styles.buscaVazia}>Nada encontrado em Produtos nem no Tempo de impressão.</li>}
          <li
            id={`${listaId}-${filtradas.length}`}
            role="option"
            aria-selected={ativo === filtradas.length}
            className={styles.buscaOpcao}
            onMouseDown={(e) => {
              e.preventDefault();
              escolher(filtradas.length);
            }}
            onMouseEnter={() => setAtivo(filtradas.length)}
          >
            <span>
              Adicionar “{textoLivre}” como item livre
              <span className={`${styles.etiqueta} ${styles.etiqueta_livre}`}>{ROTULO_ORIGEM.livre}</span>
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}
