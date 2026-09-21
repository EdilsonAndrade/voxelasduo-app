"use client";

import { useState } from "react";
import Toast from "./Toast";
import styles from "./admin.module.css";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";

function numeroDeTexto(valor: string): number {
  return Number(valor.trim().replace(",", "."));
}

/** Padrão global das taxas de Shopee e site próprio — cada produto pode sobrescrever no próprio cadastro (EDI-106). */
export default function TaxasCanaisForm({ valoresIniciais }: { valoresIniciais: TaxasCanaisConfig }) {
  const [shopee, setShopee] = useState(String(valoresIniciais.shopeeTaxaPercentual));
  const [sitePercentual, setSitePercentual] = useState(String(valoresIniciais.siteTaxaPercentual));
  const [siteFixaReais, setSiteFixaReais] = useState(
    (valoresIniciais.siteTaxaFixaCentavos / 100).toFixed(2)
  );
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
      const resposta = await fetch("/api/admin/configuracoes/taxas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopeeTaxaPercentual: numeroDeTexto(shopee),
          siteTaxaPercentual: numeroDeTexto(sitePercentual),
          siteTaxaFixaCentavos: Math.round(numeroDeTexto(siteFixaReais) * 100),
        }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar as taxas.");
        setCamposErro(dados.campos ?? {});
        return;
      }

      setToast("Taxas salvas.");
    } catch {
      setErro("Não foi possível salvar as taxas no momento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <form onSubmit={salvar} className={styles.field}>
        <span className={styles.mlLinkAviso}>
          Valores padrão usados no comparativo de preço de todos os produtos. Cada produto pode
          sobrescrevê-los no próprio cadastro.
        </span>

        <fieldset className={styles.field}>
          <legend>Shopee</legend>
          <label htmlFor="taxaShopee">Taxa estimada (%)</label>
          <input
            id="taxaShopee"
            inputMode="decimal"
            value={shopee}
            onChange={(e) => setShopee(e.target.value)}
          />
          {camposErro.shopeeTaxaPercentual && (
            <span className={styles.fieldError}>{camposErro.shopeeTaxaPercentual}</span>
          )}
        </fieldset>

        <fieldset className={styles.field}>
          <legend>Site próprio (meio de pagamento)</legend>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="taxaSitePercentual">Taxa do gateway (%)</label>
              <input
                id="taxaSitePercentual"
                inputMode="decimal"
                value={sitePercentual}
                onChange={(e) => setSitePercentual(e.target.value)}
              />
              {camposErro.siteTaxaPercentual && (
                <span className={styles.fieldError}>{camposErro.siteTaxaPercentual}</span>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="taxaSiteFixa">Taxa fixa por venda (R$)</label>
              <input
                id="taxaSiteFixa"
                inputMode="decimal"
                value={siteFixaReais}
                onChange={(e) => setSiteFixaReais(e.target.value)}
              />
              {camposErro.siteTaxaFixaCentavos && (
                <span className={styles.fieldError}>{camposErro.siteTaxaFixaCentavos}</span>
              )}
            </div>
          </div>
        </fieldset>

        {erro && <span className={styles.fieldError}>{erro}</span>}

        <div>
          <button type="submit" className={styles.btnPrimary} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar taxas"}
          </button>
        </div>
      </form>
      <Toast mensagem={toast} aoFechar={() => setToast(null)} />
    </>
  );
}
