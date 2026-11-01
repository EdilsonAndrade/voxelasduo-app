"use client";

import { useState } from "react";
import Toast from "./Toast";
import styles from "./admin.module.css";
import type { FreteConfig } from "@/lib/models/frete";

function centavosDeTexto(valor: string): number {
  const texto = valor.trim();
  if (texto === "") return Number.NaN;
  return Math.round(Number(texto.replace(",", ".")) * 100);
}

/** Valores fixos de PAC e SEDEX cobrados no checkout do site (spec 039). */
export default function FreteConfigForm({ valoresIniciais }: { valoresIniciais: FreteConfig }) {
  const [pacReais, setPacReais] = useState((valoresIniciais.pacCentavos / 100).toFixed(2));
  const [sedexReais, setSedexReais] = useState((valoresIniciais.sedexCentavos / 100).toFixed(2));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setCamposErro({});

    try {
      const resposta = await fetch("/api/admin/configuracoes/frete", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacCentavos: centavosDeTexto(pacReais),
          sedexCentavos: centavosDeTexto(sedexReais),
        }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setErro(`${dados.erro ?? "Não foi possível salvar o frete."} (status ${resposta.status})`);
        setCamposErro(dados.campos ?? {});
        return;
      }

      setToast("Frete salvo.");
    } catch {
      setErro("Não foi possível salvar o frete no momento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <form onSubmit={salvar} className={styles.field}>
        <fieldset className={styles.field}>
          <legend>Frete do site</legend>
          <span className={styles.mlLinkAviso}>
            Valor cobrado por pedido no checkout, independente da quantidade de itens. &quot;Combinar com a
            loja&quot; é sempre grátis.
          </span>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="fretePac">PAC (R$)</label>
              <input
                id="fretePac"
                inputMode="decimal"
                value={pacReais}
                onChange={(e) => setPacReais(e.target.value)}
              />
              {camposErro.pacCentavos && <span className={styles.fieldError}>{camposErro.pacCentavos}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="freteSedex">SEDEX (R$)</label>
              <input
                id="freteSedex"
                inputMode="decimal"
                value={sedexReais}
                onChange={(e) => setSedexReais(e.target.value)}
              />
              {camposErro.sedexCentavos && <span className={styles.fieldError}>{camposErro.sedexCentavos}</span>}
            </div>
          </div>
        </fieldset>

        {erro && <span className={styles.fieldError}>{erro}</span>}

        <div>
          <button type="submit" className={styles.btnPrimary} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar frete"}
          </button>
        </div>
      </form>
      <Toast mensagem={toast} aoFechar={() => setToast(null)} />
    </>
  );
}
