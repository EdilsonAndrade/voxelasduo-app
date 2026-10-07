"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LIMITES_PEDIDO_EVENTO as L } from "@/lib/models/pedidoEvento";
import { gerarSlug } from "@/lib/produtos/slug";
import type { FotoForm, ItemForm } from "./modelo";
import { comprimirFoto } from "./offline/foto";
import styles from "./evento.module.css";

const CORES_ITEM = ["var(--rosa)", "var(--laranja)", "var(--turquesa)", "var(--roxo)"];

interface Props {
  item: ItemForm;
  indice: number;
  produtos: string[];
  podeRemover: boolean;
  erro?: string;
  erroQuantidade?: string;
  onChange: (item: ItemForm) => void;
  onRemover: () => void;
}

function Miniatura({ foto, onRemover }: { foto: FotoForm; onRemover: () => void }) {
  const src = useMemo(() => (foto.blob ? URL.createObjectURL(foto.blob) : foto.url), [foto.blob, foto.url]);
  useEffect(() => () => {
    if (foto.blob && src) URL.revokeObjectURL(src);
  }, [foto.blob, src]);

  return (
    <div className={styles.miniatura}>
      {/* eslint-disable-next-line @next/next/no-img-element -- blob local, fora do otimizador de imagens */}
      <img src={src} alt="Foto do item" />
      <button type="button" className={styles.miniaturaRemover} onClick={onRemover} aria-label="Tirar esta foto">
        ×
      </button>
    </div>
  );
}

const MAX_SUGESTOES = 60;

/**
 * Campo "O que é?": texto livre com a lista de produtos do catálogo abaixo.
 * A busca acha o termo em qualquer parte do nome, sem ligar para acentos
 * ("gato" encontra "Chaveiro de Gato Rosa"); a seta abre a lista inteira.
 */
function CampoProduto({
  valor,
  produtos,
  invalido,
  onChange,
}: {
  valor: string;
  produtos: string[];
  invalido: boolean;
  onChange: (valor: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const raizRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaId = useId();

  const sugestoes = useMemo(() => {
    const busca = mostrarTodos ? "" : gerarSlug(valor);
    const achados = busca ? produtos.filter((nome) => gerarSlug(nome).includes(busca)) : produtos;
    return achados.slice(0, MAX_SUGESTOES);
  }, [produtos, valor, mostrarTodos]);

  useEffect(() => {
    if (!aberto) return;
    function fecharAoTocarFora(evento: PointerEvent) {
      if (!raizRef.current?.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("pointerdown", fecharAoTocarFora);
    return () => document.removeEventListener("pointerdown", fecharAoTocarFora);
  }, [aberto]);

  function escolher(nome: string) {
    onChange(nome);
    setAberto(false);
    setMostrarTodos(false);
    setAtivo(-1);
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAberto(true);
      setAtivo((i) => Math.min(i + 1, sugestoes.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtivo((i) => Math.max(i - 1, 0));
    } else if (evento.key === "Enter" && aberto && sugestoes[ativo]) {
      evento.preventDefault();
      escolher(sugestoes[ativo]);
    } else if (evento.key === "Escape" && aberto) {
      evento.preventDefault();
      setAberto(false);
    }
  }

  const listaVisivel = aberto && sugestoes.length > 0;

  return (
    <div className={styles.produtoBusca} ref={raizRef}>
      <div className={styles.produtoCampo}>
        <input
          ref={inputRef}
          className={styles.input}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listaVisivel}
          aria-controls={listaId}
          aria-activedescendant={listaVisivel && sugestoes[ativo] ? `${listaId}-${ativo}` : undefined}
          aria-invalid={invalido}
          value={valor}
          maxLength={L.descricaoMax}
          autoComplete="off"
          placeholder={produtos.length ? "Escolha um produto ou escreva" : "Ex.: chaveiro de gato rosa"}
          onChange={(e) => {
            onChange(e.target.value);
            setMostrarTodos(false);
            setAtivo(-1);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={aoTeclar}
          enterKeyHint="done"
        />
        {produtos.length > 0 && (
          <button
            type="button"
            className={styles.produtoSeta}
            aria-label={aberto && mostrarTodos ? "Fechar lista de produtos" : "Ver todos os produtos"}
            onClick={() => {
              const abrirTodos = !(aberto && mostrarTodos);
              setMostrarTodos(abrirTodos);
              setAberto(abrirTodos);
              setAtivo(-1);
              if (abrirTodos) inputRef.current?.focus();
            }}
          >
            <span aria-hidden="true">▾</span>
          </button>
        )}
      </div>

      {listaVisivel && (
        <ul className={styles.produtoLista} role="listbox" id={listaId}>
          {sugestoes.map((nome, indice) => (
            <li
              key={nome}
              id={`${listaId}-${indice}`}
              role="option"
              aria-selected={indice === ativo}
              className={`${styles.produtoOpcao} ${indice === ativo ? styles.produtoOpcaoAtiva : ""}`}
              // mousedown, não click: escolhe antes de o campo perder o foco.
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(nome);
              }}
            >
              {nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Um item do pedido: fotos (câmera ou galeria) e/ou descrição + quantidade com − e +. */
export default function ItemPedido({ item, indice, produtos, podeRemover, erro, erroQuantidade, onChange, onRemover }: Props) {
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const [preparandoFoto, setPreparandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  // Texto do campo de quantidade: pode ficar vazio enquanto se digita (ex.: apagar o 1 para escrever 300).
  const [textoQuantidade, setTextoQuantidade] = useState(String(item.quantidade));

  useEffect(() => {
    setTextoQuantidade((atual) => (Number(atual) === item.quantidade ? atual : String(item.quantidade)));
  }, [item.quantidade]);

  const cheioDeFotos = item.fotos.length >= L.fotosPorItem;

  async function adicionarFotos(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErroFoto(null);
    setPreparandoFoto(true);
    try {
      const vagas = L.fotosPorItem - item.fotos.length;
      const novas: FotoForm[] = [];
      for (const arquivo of Array.from(arquivos).slice(0, vagas)) {
        novas.push({ chave: `local:${crypto.randomUUID()}`, blob: await comprimirFoto(arquivo) });
      }
      onChange({ ...item, fotos: [...item.fotos, ...novas] });
      if (arquivos.length > vagas) setErroFoto(`Cabem só ${L.fotosPorItem} fotos por item.`);
    } catch (e) {
      setErroFoto((e as Error).message || "Não foi possível usar essa foto.");
    } finally {
      setPreparandoFoto(false);
      if (camera.current) camera.current.value = "";
      if (galeria.current) galeria.current.value = "";
    }
  }

  function digitarQuantidade(valor: string) {
    const digitos = valor.replace(/\D/g, "").slice(0, String(L.quantidadeMax).length);
    setTextoQuantidade(digitos);
    // Vazio vira 0 para a validação acusar, caso salvem sem preencher.
    onChange({ ...item, quantidade: digitos ? Math.min(L.quantidadeMax, Number(digitos)) : 0 });
  }

  function confirmarQuantidade() {
    if (item.quantidade < L.quantidadeMin) {
      setTextoQuantidade(String(L.quantidadeMin));
      onChange({ ...item, quantidade: L.quantidadeMin });
    } else {
      setTextoQuantidade(String(item.quantidade));
    }
  }

  function mudarQuantidade(delta: number) {
    const quantidade = Math.min(L.quantidadeMax, Math.max(L.quantidadeMin, item.quantidade + delta));
    onChange({ ...item, quantidade });
  }

  return (
    <fieldset
      className={`${styles.item} ${erro || erroQuantidade ? styles.itemComErro : ""}`}
      style={{ "--cor-item": CORES_ITEM[indice % CORES_ITEM.length] } as React.CSSProperties}
      id={`item-${indice}`}
    >
      <legend className={styles.itemTitulo}>Item {indice + 1}</legend>

      {podeRemover && !confirmandoRemocao && (
        <button
          type="button"
          className={styles.itemLixeira}
          onClick={() => setConfirmandoRemocao(true)}
          aria-label={`Remover item ${indice + 1}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
          </svg>
        </button>
      )}

      {confirmandoRemocao && (
        <div className={styles.confirmarRemocao} role="alertdialog" aria-label="Confirmar remoção do item">
          <span>Remover este item?</span>
          <button type="button" className={styles.botaoPerigo} onClick={onRemover}>
            Sim, remover
          </button>
          <button type="button" className={styles.botaoSecundario} onClick={() => setConfirmandoRemocao(false)}>
            Não
          </button>
        </div>
      )}

      <div className={styles.fotos}>
        {item.fotos.map((foto) => (
          <Miniatura
            key={foto.chave}
            foto={foto}
            onRemover={() => onChange({ ...item, fotos: item.fotos.filter((f) => f.chave !== foto.chave) })}
          />
        ))}
        {!cheioDeFotos && (
          <>
            <button
              type="button"
              className={styles.botaoFoto}
              onClick={() => camera.current?.click()}
              disabled={preparandoFoto}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              {preparandoFoto ? "Preparando…" : "Tirar foto"}
            </button>
            <button
              type="button"
              className={styles.botaoGaleria}
              onClick={() => galeria.current?.click()}
              disabled={preparandoFoto}
            >
              Galeria
            </button>
          </>
        )}
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => adicionarFotos(e.target.files)}
        />
        <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={(e) => adicionarFotos(e.target.files)} />
      </div>
      {erroFoto && <p className={styles.erroCampo}>{erroFoto}</p>}

      <label className={styles.campo}>
        <span className={styles.rotulo}>O que é?</span>
        <CampoProduto
          valor={item.descricao}
          produtos={produtos}
          invalido={!!erro}
          onChange={(descricao) => onChange({ ...item, descricao })}
        />
      </label>
      {erro && (
        <p className={styles.erroCampo} role="alert">
          {erro}
        </p>
      )}

      <div className={styles.quantidade}>
        <span className={styles.rotulo}>Quantidade</span>
        <div className={styles.contador}>
          <button
            type="button"
            onClick={() => mudarQuantidade(-1)}
            disabled={item.quantidade <= L.quantidadeMin}
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            aria-label="Quantidade"
            value={textoQuantidade}
            onFocus={(e) => e.target.select()}
            onChange={(e) => digitarQuantidade(e.target.value)}
            onBlur={confirmarQuantidade}
          />
          <button
            type="button"
            onClick={() => mudarQuantidade(1)}
            disabled={item.quantidade >= L.quantidadeMax}
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>
      </div>
      {erroQuantidade && <p className={styles.erroCampo}>{erroQuantidade}</p>}
    </fieldset>
  );
}
