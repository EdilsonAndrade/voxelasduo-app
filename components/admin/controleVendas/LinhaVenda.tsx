"use client";

import { useState } from "react";
import { calcularVenda, custoEfetivo, precoEfetivo, taxaPadraoCanal } from "@/lib/controleVendas/calculo";
import { centavosParaCampo, hojeIso, reaisParaCentavos, textoParaPercentual } from "@/lib/controleVendas/formato";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import {
  BAIXA_ESTOQUE_PADRAO,
  CANAIS_CONTROLE,
  ROTULO_CANAL_CONTROLE,
  type CanalControle,
  type ItemControleJson,
  type VendaControleJson,
  type VendaControlePayload,
} from "@/lib/models/controleVendas";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./controleVendas.module.css";

interface Campos {
  data: string;
  quantidade: string;
  cliente: string;
  canal: CanalControle;
  preco: string;
  taxaPercentual: string;
  taxaFixa: string;
  extras: string;
  baixarEstoque: boolean;
}

function camposDaVenda(venda: VendaControleJson): Campos {
  return {
    data: venda.data.slice(0, 10),
    quantidade: String(venda.quantidade),
    cliente: venda.cliente,
    canal: venda.canal,
    preco: centavosParaCampo(venda.precoUnitarioCentavos),
    taxaPercentual: String(venda.taxaPercentual).replace(".", ","),
    taxaFixa: centavosParaCampo(venda.taxaFixaCentavos),
    extras: centavosParaCampo(venda.extrasCentavos),
    baixarEstoque: venda.baixarEstoque,
  };
}

function camposNovos(item: ItemControleJson, taxas: TaxasCanaisConfig): Campos {
  const canal: CanalControle = "direta";
  const preco = precoEfetivo(item);
  const taxa = taxaPadraoCanal(canal, taxas, preco, 1);
  return {
    data: hojeIso(),
    quantidade: "1",
    cliente: "",
    canal,
    preco: centavosParaCampo(preco),
    taxaPercentual: String(taxa.taxaPercentual).replace(".", ","),
    taxaFixa: centavosParaCampo(taxa.taxaFixaCentavos),
    extras: "0,00",
    baixarEstoque: BAIXA_ESTOQUE_PADRAO[canal],
  };
}

/** Converte os campos digitados; `null` quando algum número não fecha. */
function paraPayload(c: Campos): VendaControlePayload | null {
  const quantidade = Number(c.quantidade);
  const preco = reaisParaCentavos(c.preco);
  const taxaPercentual = textoParaPercentual(c.taxaPercentual || "0");
  const taxaFixa = reaisParaCentavos(c.taxaFixa || "0");
  const extras = reaisParaCentavos(c.extras || "0");
  if (!Number.isInteger(quantidade) || quantidade < 1 || preco === null) return null;
  if (taxaPercentual === null || taxaFixa === null || extras === null || !c.data) return null;
  return {
    // Meio-dia: a data não muda de dia ao converter para UTC.
    data: `${c.data}T12:00:00.000Z`,
    quantidade,
    cliente: c.cliente,
    canal: c.canal,
    precoUnitarioCentavos: preco,
    taxaPercentual,
    taxaFixaCentavos: taxaFixa,
    extrasCentavos: extras,
    baixarEstoque: c.baixarEstoque,
  };
}

/**
 * Uma venda como linha editável — ou, sem `venda`, a linha de lançamento rápido
 * no fim da tabela. O lucro acompanha o que está digitado, antes de salvar.
 */
export default function LinhaVenda({
  item,
  taxas,
  venda,
  aoSalvar,
  aoRemover,
}: {
  item: ItemControleJson;
  taxas: TaxasCanaisConfig;
  venda?: VendaControleJson;
  aoSalvar: (payload: VendaControlePayload) => Promise<boolean>;
  aoRemover?: () => Promise<void>;
}) {
  const nova = !venda;
  const inicial = venda ? camposDaVenda(venda) : camposNovos(item, taxas);
  const [campos, setCampos] = useState<Campos>(inicial);
  const [salvando, setSalvando] = useState(false);

  const original = venda ? camposDaVenda(venda) : null;
  const alterada = original !== null && JSON.stringify(original) !== JSON.stringify(campos);
  const payload = paraPayload(campos);
  const lucro = payload ? calcularVenda(payload, custoEfetivo(item)).lucroCentavos : null;

  function alterar<K extends keyof Campos>(campo: K, valor: Campos[K]) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  function trocarCanal(canal: CanalControle) {
    const preco = reaisParaCentavos(campos.preco) ?? 0;
    const quantidade = Math.max(1, Number(campos.quantidade) || 1);
    const taxa = taxaPadraoCanal(canal, taxas, preco, quantidade);
    setCampos((atual) => ({
      ...atual,
      canal,
      taxaPercentual: String(taxa.taxaPercentual).replace(".", ","),
      taxaFixa: centavosParaCampo(taxa.taxaFixaCentavos),
      baixarEstoque: BAIXA_ESTOQUE_PADRAO[canal],
    }));
  }

  async function salvar() {
    if (!payload || salvando) return;
    setSalvando(true);
    const ok = await aoSalvar(payload);
    setSalvando(false);
    if (ok && nova) setCampos(camposNovos(item, taxas));
  }

  async function remover() {
    if (!aoRemover || salvando) return;
    setSalvando(true);
    await aoRemover();
    setSalvando(false);
  }

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      salvar();
    }
  };

  return (
    <tr className={nova ? styles.linhaNova : alterada ? styles.linhaAlterada : undefined} onKeyDown={aoTeclar}>
      <td>
        <input
          type="date"
          className={styles.campo}
          value={campos.data}
          onChange={(e) => alterar("data", e.target.value)}
          aria-label="Data da venda"
        />
      </td>
      <td>
        <input
          type="number"
          min={1}
          className={`${styles.campo} ${styles.campoCurto}`}
          value={campos.quantidade}
          onChange={(e) => alterar("quantidade", e.target.value)}
          aria-label="Quantidade vendida"
        />
      </td>
      <td>
        <input
          type="text"
          className={`${styles.campo} ${styles.campoCliente}`}
          value={campos.cliente}
          placeholder="Nome ou observação"
          maxLength={120}
          onChange={(e) => alterar("cliente", e.target.value)}
          aria-label="Para quem foi vendido"
        />
      </td>
      <td>
        <select
          className={styles.campo}
          value={campos.canal}
          onChange={(e) => trocarCanal(e.target.value as CanalControle)}
          aria-label="Canal da venda"
        >
          {CANAIS_CONTROLE.map((canal) => (
            <option key={canal} value={canal}>
              {ROTULO_CANAL_CONTROLE[canal]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          inputMode="decimal"
          className={`${styles.campo} ${styles.campoValor}`}
          value={campos.preco}
          onChange={(e) => alterar("preco", e.target.value)}
          aria-label="Preço unitário em reais"
        />
      </td>
      <td>
        <input
          inputMode="decimal"
          className={`${styles.campo} ${styles.campoCurto}`}
          value={campos.taxaPercentual}
          onChange={(e) => alterar("taxaPercentual", e.target.value)}
          aria-label="Taxa do canal em %"
        />
      </td>
      <td>
        <input
          inputMode="decimal"
          className={`${styles.campo} ${styles.campoValor}`}
          value={campos.taxaFixa}
          onChange={(e) => alterar("taxaFixa", e.target.value)}
          aria-label="Taxa fixa da venda em reais"
        />
      </td>
      <td>
        <input
          inputMode="decimal"
          className={`${styles.campo} ${styles.campoValor}`}
          value={campos.extras}
          onChange={(e) => alterar("extras", e.target.value)}
          aria-label="Material extra enviado em reais (sacola, fita…)"
        />
      </td>
      <td className={styles.celulaCentro}>
        <input
          type="checkbox"
          checked={campos.baixarEstoque}
          onChange={(e) => alterar("baixarEstoque", e.target.checked)}
          aria-label="Baixar do estoque do site"
        />
      </td>
      <td className={`${styles.numero} ${lucro !== null && lucro < 0 ? styles.prejuizo : styles.lucro}`}>
        {lucro === null ? "—" : formatarPreco(lucro)}
      </td>
      <td className={styles.colunaAcoes}>
        <div className={styles.acoesLinha}>
        {nova ? (
          <button type="button" className={styles.botaoLancar} onClick={salvar} disabled={!payload || salvando}>
            {salvando ? "Lançando…" : "Lançar"}
          </button>
        ) : (
          <>
            {alterada && (
              <>
                <button type="button" className={styles.botaoLancar} onClick={salvar} disabled={!payload || salvando}>
                  Salvar
                </button>
                <button type="button" className={styles.botaoTexto} onClick={() => setCampos(original!)}>
                  Desfazer
                </button>
              </>
            )}
            <button
              type="button"
              className={styles.botaoRemover}
              onClick={remover}
              disabled={salvando}
              aria-label="Excluir venda"
              title="Excluir venda"
            >
              ×
            </button>
          </>
        )}
        </div>
      </td>
    </tr>
  );
}
