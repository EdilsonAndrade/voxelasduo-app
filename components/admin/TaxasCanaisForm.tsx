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
  const shopee = String(valoresIniciais.shopeeTaxaPercentual);
  const [sitePercentual, setSitePercentual] = useState(String(valoresIniciais.siteTaxaPercentual));
  const [siteFixaReais, setSiteFixaReais] = useState(
    (valoresIniciais.siteTaxaFixaCentavos / 100).toFixed(2)
  );
  const [margemMinima, setMargemMinima] = useState(String(valoresIniciais.margemMinimaPercentual));
  const [margemDesejada, setMargemDesejada] = useState(String(valoresIniciais.margemDesejadaPercentual));
  const [cupomPercentual, setCupomPercentual] = useState(String(valoresIniciais.cupomLojaPercentual));
  const [cupomTetoReais, setCupomTetoReais] = useState(
    valoresIniciais.cupomLojaTetoCentavos !== null ? (valoresIniciais.cupomLojaTetoCentavos / 100).toFixed(2) : ""
  );
  const [cupomSemLimite, setCupomSemLimite] = useState(valoresIniciais.cupomLojaTetoCentavos === null);
  const [cupomCestaReais, setCupomCestaReais] = useState(
    (valoresIniciais.cupomLojaCestaMinimaCentavos / 100).toFixed(2)
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
          margemMinimaPercentual: numeroDeTexto(margemMinima),
          margemDesejadaPercentual: numeroDeTexto(margemDesejada),
          cupomLojaPercentual: cupomPercentual.trim() === "" ? 0 : numeroDeTexto(cupomPercentual),
          cupomLojaTetoCentavos: cupomSemLimite ? null : Math.round(numeroDeTexto(cupomTetoReais) * 100),
          cupomLojaCestaMinimaCentavos:
            cupomCestaReais.trim() === "" ? 0 : Math.round(numeroDeTexto(cupomCestaReais) * 100),
        }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(`${dados.erro ?? "Não foi possível salvar as taxas."} (status ${resposta.status})`);
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
          {/* O % antigo continua salvo (a API exige o campo), mas os cálculos usam a tabela por faixa. */}
          <span className={styles.mlLinkAviso}>
            Usa a tabela oficial por faixa de preço, a mesma da calculadora: até R$ 79,99 = 20% + R$ 4,50; até
            R$ 99,99 = 14% + R$ 16; até R$ 199,99 = 14% + R$ 20; acima = 14% + R$ 26.
          </span>
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
          <legend>Margens (% do preço de venda)</legend>
          <span className={styles.mlLinkAviso}>
            Margem = de cada R$ 100 vendidos, quanto fica com você depois de pagar o custo e as taxas do
            canal. É a mesma conta da calculadora e dos marketplaces.
          </span>
          <label htmlFor="margemDesejada">Margem de lucro desejada padrão (% do preço)</label>
          <input
            id="margemDesejada"
            inputMode="decimal"
            value={margemDesejada}
            onChange={(e) => setMargemDesejada(e.target.value)}
          />
          <span className={styles.mlLinkAviso}>
            Usada para calcular o &quot;preço sugerido&quot;. Deixe acima do piso: a diferença é a verba para
            cupons e promoções. Pode ser sobrescrita por produto.
          </span>
          {camposErro.margemDesejadaPercentual && (
            <span className={styles.fieldError}>{camposErro.margemDesejadaPercentual}</span>
          )}

          <label htmlFor="margemMinima">Piso de lucro (% do preço)</label>
          <input
            id="margemMinima"
            inputMode="decimal"
            value={margemMinima}
            onChange={(e) => setMargemMinima(e.target.value)}
          />
          <span className={styles.mlLinkAviso}>
            O mínimo que você aceita ganhar mesmo com cupom ou promoção. Tudo que a margem do produto
            passar disso é verba de desconto. Pode ser sobrescrito por produto.
          </span>
          {camposErro.margemMinimaPercentual && (
            <span className={styles.fieldError}>{camposErro.margemMinimaPercentual}</span>
          )}
        </fieldset>

        <fieldset className={styles.field}>
          <legend>Cupom de loja (Shopee)</legend>
          <span className={styles.mlLinkAviso}>
            O cupom que vale para todos os produtos da loja. Ele sai primeiro da verba de desconto de
            cada produto; o que sobra fica livre para promoção relâmpago, cupom do produto etc.
          </span>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="cupomLojaPercentual">Desconto (%)</label>
              <input
                id="cupomLojaPercentual"
                inputMode="decimal"
                placeholder="Ex: 3 (0 = sem cupom)"
                value={cupomPercentual}
                onChange={(e) => setCupomPercentual(e.target.value)}
              />
              {camposErro.cupomLojaPercentual && (
                <span className={styles.fieldError}>{camposErro.cupomLojaPercentual}</span>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="cupomLojaTeto">Desconto máximo (R$)</label>
              <input
                id="cupomLojaTeto"
                inputMode="decimal"
                placeholder="Ex: 5.00"
                value={cupomSemLimite ? "" : cupomTetoReais}
                disabled={cupomSemLimite}
                onChange={(e) => setCupomTetoReais(e.target.value)}
              />
              <label className={styles.channelToggle}>
                <input
                  type="checkbox"
                  checked={cupomSemLimite}
                  onChange={(e) => setCupomSemLimite(e.target.checked)}
                />{" "}
                Sem limite
              </label>
              {camposErro.cupomLojaTetoCentavos && (
                <span className={styles.fieldError}>{camposErro.cupomLojaTetoCentavos}</span>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="cupomLojaCesta">Valor mínimo da cesta (R$)</label>
              <input
                id="cupomLojaCesta"
                inputMode="decimal"
                placeholder="Ex: 10.00"
                value={cupomCestaReais}
                onChange={(e) => setCupomCestaReais(e.target.value)}
              />
              <span className={styles.mlLinkAviso}>
                Só para registro: a conta sempre desconta o cupom, porque o cliente pode completar a cesta
                com outros itens.
              </span>
              {camposErro.cupomLojaCestaMinimaCentavos && (
                <span className={styles.fieldError}>{camposErro.cupomLojaCestaMinimaCentavos}</span>
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
