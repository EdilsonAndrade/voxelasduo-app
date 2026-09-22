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
  const [margemMinima, setMargemMinima] = useState(String(valoresIniciais.margemMinimaPercentual));
  const [margemDesejada, setMargemDesejada] = useState(String(valoresIniciais.margemDesejadaPercentual));
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
          margemMinimaPercentual: numeroDeTexto(margemMinima),
          margemDesejadaPercentual: numeroDeTexto(margemDesejada),
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

        <fieldset className={styles.field}>
          <legend>Margens</legend>
          <label htmlFor="margemDesejada">Margem de lucro desejada padrão (%)</label>
          <input
            id="margemDesejada"
            inputMode="decimal"
            value={margemDesejada}
            onChange={(e) => setMargemDesejada(e.target.value)}
          />
          <span className={styles.mlLinkAviso}>
            Usada para calcular o "preço sugerido" no simulador — é sobre o custo, sem teto (100% =
            dobrar o custo). Pode ser sobrescrita por produto.
          </span>
          {camposErro.margemDesejadaPercentual && (
            <span className={styles.fieldError}>{camposErro.margemDesejadaPercentual}</span>
          )}

          <label htmlFor="margemMinima">Margem de lucro mínima aceitável (%)</label>
          <input
            id="margemMinima"
            inputMode="decimal"
            value={margemMinima}
            onChange={(e) => setMargemMinima(e.target.value)}
          />
          <span className={styles.mlLinkAviso}>
            Usada para calcular o preço mínimo e o desconto máximo de cada canal — o piso de
            segurança para você rodar promoções sem vender no prejuízo. Pode ser sobrescrita por
            produto.
          </span>
          {camposErro.margemMinimaPercentual && (
            <span className={styles.fieldError}>{camposErro.margemMinimaPercentual}</span>
          )}
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
