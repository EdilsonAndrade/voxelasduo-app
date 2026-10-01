"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LIMITES_PEDIDO_EVENTO as L } from "@/lib/models/pedidoEvento";
import type { FotoForm, ItemForm } from "./modelo";
import { comprimirFoto } from "./offline/foto";
import styles from "./evento.module.css";

const CORES_ITEM = ["var(--rosa)", "var(--laranja)", "var(--turquesa)", "var(--roxo)"];

interface Props {
  item: ItemForm;
  indice: number;
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

/** Um item do pedido: fotos (câmera ou galeria) e/ou descrição + quantidade com − e +. */
export default function ItemPedido({ item, indice, podeRemover, erro, erroQuantidade, onChange, onRemover }: Props) {
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const [preparandoFoto, setPreparandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);

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
        <input
          className={styles.input}
          value={item.descricao}
          maxLength={L.descricaoMax}
          placeholder="Ex.: chaveiro de gato rosa"
          onChange={(e) => onChange({ ...item, descricao: e.target.value })}
          enterKeyHint="done"
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
          <output aria-live="polite" aria-label="Quantidade">
            {item.quantidade}
          </output>
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
