"use client";

import styles from "../admin.module.css";
import calc from "../calculadoraRapida.module.css";
import SelectBusca from "../SelectBusca";
import type { CategoriaExtra, ExtraCalculadora, ImpressaoCalculadora } from "@/lib/models/calculoPreco";
import type { InsumoCalculadora } from "@/lib/financeiro/insumos";
import { ROTULO_CATEGORIA } from "@/lib/produtos/custoCalculadora";
import { Campo, Divisor } from "./campos";
import Secao from "./Secao";
import { soNumero } from "./formato";

const RAPIDOS: Array<{ item: string; precoReais: string; categoria: CategoriaExtra }> = [
  { item: "Caixa de papelão", precoReais: "1.20", categoria: "embalagem" },
  { item: "Plástico bolha", precoReais: "0.20", categoria: "embalagem" },
  { item: "Etiqueta", precoReais: "0.20", categoria: "outros" },
  { item: "Fita adesiva", precoReais: "0.10", categoria: "embalagem" },
  { item: "Saco plástico", precoReais: "0.15", categoria: "embalagem" },
  { item: "Mão de obra", precoReais: "", categoria: "maoDeObra" },
];

export default function SecaoCustosExtras({
  impressao,
  alterar,
  resumo,
  insumos = [],
}: {
  impressao: ImpressaoCalculadora;
  alterar: (parcial: Partial<ImpressaoCalculadora>) => void;
  resumo?: string;
  /** Insumos do catálogo (financeiro) — custo por unidade pronto para usar. */
  insumos?: InsumoCalculadora[];
}) {
  const extras = impressao.extras;
  const usaLista = extras.length > 0;
  const porId = new Map(insumos.map((i) => [i.id, i]));

  function adicionar(novo: ExtraCalculadora) {
    // O primeiro item leva junto a embalagem do campo simples, para ela não sumir do custo.
    const embalagem = impressao.embalagemReais.trim();
    const herdada: ExtraCalculadora[] =
      !usaLista && embalagem !== "" && Number(embalagem.replace(",", ".")) > 0 && novo.categoria !== "embalagem"
        ? [{ item: "Embalagem", quantidade: "1", precoReais: embalagem, categoria: "embalagem" }]
        : [];
    alterar({ extras: [...extras, ...herdada, novo] });
  }

  function alterarExtra(indice: number, parcial: Partial<ExtraCalculadora>) {
    alterar({ extras: extras.map((e, i) => (i === indice ? { ...e, ...parcial } : e)) });
  }

  function adicionarInsumo(id: string) {
    const insumo = porId.get(id);
    if (!insumo) return;
    adicionar({ item: insumo.nome, quantidade: "1", precoReais: insumo.precoReais, categoria: insumo.categoria, insumoId: insumo.id });
  }

  /** Linhas cujo insumo mudou de preço depois do cálculo — o custo salvo fica como estava. */
  const desatualizados = extras
    .map((extra, indice) => ({ extra, indice, insumo: extra.insumoId ? porId.get(extra.insumoId) : undefined }))
    .filter((l) => l.insumo && l.insumo.precoReais !== l.extra.precoReais);

  return (
    <Secao icone="extras" titulo="Custos extras" resumo={resumo}>
      <p className={calc.textoApoio}>
        Tudo o que vai junto com a peça: embalagem, acabamento, mão de obra. Valores por unidade vendida — não são divididos
        pelas peças da mesa.
      </p>

      {insumos.length > 0 && (
        <div className={calc.insumos}>
          <span>Insumo cadastrado:</span>
          <span className={calc.insumosSelect}>
            <SelectBusca
              opcoes={insumos.map((i) => ({ valor: i.id, rotulo: i.rotulo }))}
              valor=""
              onChange={adicionarInsumo}
              placeholder="Escolher insumo…"
              placeholderBusca="Buscar insumo…"
              rotuloAcessivel="Adicionar insumo cadastrado aos custos extras"
              compacto
            />
          </span>
          <span>Depois diga quantos vão em cada peça.</span>
        </div>
      )}

      <div className={calc.rapidos}>
        <span>Adicionar rápido:</span>
        {RAPIDOS.map((r) => (
          <button key={r.item} type="button" className={calc.chip} onClick={() => adicionar({ ...r, quantidade: "1" })}>
            + {r.item}
          </button>
        ))}
      </div>

      <Divisor>Sem lista</Divisor>
      <div className={calc.campos3}>
        <Campo
          id="embalagem"
          rotulo="Embalagem"
          prefixo="R$"
          valor={impressao.embalagemReais}
          onChange={(v) => alterar({ embalagemReais: v })}
          desabilitado={usaLista}
          dica={usaLista ? "Com a lista abaixo, vale a lista." : "Saquinho, caixa… por unidade."}
        />
      </div>

      {usaLista && (
        <>
          <Divisor>Lista de extras</Divisor>
          <div className={calc.lista}>
            <div className={`${calc.listaLinha} ${calc.listaCabecalho} ${calc.listaExtra}`} aria-hidden="true">
              <span>Item</span>
              <span>Qtd</span>
              <span>Preço (R$)</span>
              <span>Categoria</span>
              <span />
            </div>
            {extras.map((e, i) => (
              <div key={i} className={`${calc.listaLinha} ${calc.listaExtra}`}>
                <input aria-label={`Item ${i + 1}`} placeholder="Item" value={e.item} onChange={(ev) => alterarExtra(i, { item: ev.target.value })} />
                <input aria-label={`Quantidade do item ${i + 1}`} inputMode="decimal" value={e.quantidade} onChange={(ev) => alterarExtra(i, { quantidade: soNumero(ev.target.value) })} />
                <input
                  aria-label={`Preço do item ${i + 1}`}
                  inputMode="decimal"
                  value={e.precoReais}
                  autoFocus={e.precoReais === "" && i === extras.length - 1}
                  onChange={(ev) => alterarExtra(i, { precoReais: soNumero(ev.target.value) })}
                />
                <select aria-label={`Categoria do item ${i + 1}`} value={e.categoria} onChange={(ev) => alterarExtra(i, { categoria: ev.target.value as CategoriaExtra })}>
                  {(Object.keys(ROTULO_CATEGORIA) as CategoriaExtra[]).map((c) => (
                    <option key={c} value={c}>
                      {ROTULO_CATEGORIA[c]}
                    </option>
                  ))}
                </select>
                <button type="button" className={calc.remover} aria-label={`Remover ${e.item || `item ${i + 1}`}`} onClick={() => alterar({ extras: extras.filter((_, j) => j !== i) })}>
                  ×
                </button>
              </div>
            ))}
          </div>
          {desatualizados.map(({ extra, indice, insumo }) => (
            <div key={`${insumo!.id}-${indice}`} className={calc.avisoInsumo}>
              <span>
                {insumo!.nome} está a R$ {insumo!.precoReais} no catálogo (aqui está R$ {extra.precoReais}).
              </span>
              <button type="button" className={calc.chip} onClick={() => alterarExtra(indice, { precoReais: insumo!.precoReais })}>
                Usar o preço do catálogo
              </button>
            </div>
          ))}
          <span className={styles.mlLinkAviso}>No kit, a categoria Embalagem entra uma vez por pedido; o resto entra por peça.</span>
        </>
      )}
      <button type="button" className={calc.adicionar} onClick={() => adicionar({ item: "", quantidade: "1", precoReais: "", categoria: "outros" })}>
        + Adicionar item
      </button>
    </Secao>
  );
}
