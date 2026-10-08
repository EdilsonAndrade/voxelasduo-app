"use client";

import type { ReactNode } from "react";
import { formatarPreco } from "@/lib/produtos/formato";
import {
  centavosParaTexto,
  margemPercentual,
  textoParaCentavos,
  textoParaEstoque,
} from "@/lib/produtos/precoLista";
import styles from "./listaProdutos.module.css";

export type CampoPreco = "site" | "mercadoLivre" | "shopee";

export interface PrecosLinha {
  site: number;
  mercadoLivre: number | null;
  shopee: number | null;
}

/** Estado de edição de uma linha — fica na lista, que também aplica o ajuste e salva todas (EDI-126). */
export interface EstadoLinha {
  /** Últimos preços gravados. */
  original: PrecosLinha;
  textos: Record<CampoPreco, string>;
  /** Último estoque gravado, em unidades. */
  estoqueOriginal: number;
  /** Texto do campo de estoque da linha — editado junto com os preços e salvo pelo mesmo botão. */
  estoqueTexto: string;
  /** Percentual aplicado nesta tela e ainda não salvo. */
  ajustePendente: number | null;
  /** Ajuste do evento já gravado. */
  ajusteAtivo: { percentual: number; precoAnterior: number } | null;
  salvando: boolean;
  status: { tipo: "ok" | "erro"; texto: string } | null;
}

export function linhaAlterada(estado: EstadoLinha): boolean {
  return (
    estado.ajustePendente !== null ||
    textoParaEstoque(estado.estoqueTexto) !== estado.estoqueOriginal ||
    textoParaCentavos(estado.textos.site) !== estado.original.site ||
    textoParaCentavos(estado.textos.mercadoLivre) !== estado.original.mercadoLivre ||
    textoParaCentavos(estado.textos.shopee) !== estado.original.shopee
  );
}

function valido(texto: string): number | null {
  const centavos = textoParaCentavos(texto);
  return centavos !== null && !Number.isNaN(centavos) ? centavos : null;
}

function Margem({ precoCentavos, custoCentavos }: { precoCentavos: number | null; custoCentavos: number | null }) {
  const margem = margemPercentual(precoCentavos, custoCentavos);
  if (margem === null) return null;
  const classe = margem < 0 ? styles.margemNegativa : margem < 30 ? styles.margemBaixa : styles.margem;
  return (
    <span className={classe} title="Margem sobre o preço: (preço − custo) ÷ preço">
      margem {margem}%
    </span>
  );
}

const CAMPOS: { campo: CampoPreco; rotulo: string; acessivel: string }[] = [
  { campo: "site", rotulo: "Site", acessivel: "Preço do site" },
  { campo: "mercadoLivre", rotulo: "Mercado Livre", acessivel: "Preço no Mercado Livre" },
  { campo: "shopee", rotulo: "Shopee", acessivel: "Preço na Shopee" },
];

/**
 * Preços do site, Mercado Livre e Shopee editáveis na lista de produtos
 * (EDI-126). Só grava pelo "Salvar alterações" do menu da linha (ou Enter);
 * canal vazio = usa o preço do site.
 */
export default function LinhaPrecoProduto({
  produtoNome,
  estado,
  custoCentavos,
  onEditar,
  onSalvar,
  menu,
}: {
  produtoNome: string;
  estado: EstadoLinha;
  custoCentavos: number | null;
  onEditar: (campo: CampoPreco, valor: string) => void;
  onSalvar: () => void;
  /** Menu ☰ da linha (salvar, editar, duplicar, destaques) — fica no lugar do antigo botão Salvar. */
  menu: ReactNode;
}) {
  const alterado = linhaAlterada(estado);
  const site = valido(estado.textos.site);

  return (
    <form
      className={styles.precos}
      onSubmit={(evento) => {
        evento.preventDefault();
        if (alterado && !estado.salvando) onSalvar();
      }}
      noValidate
    >
      {CAMPOS.map(({ campo, rotulo, acessivel }) => {
        const valor = valido(estado.textos[campo]);
        return (
          <label key={campo} className={styles.campoPreco}>
            <span className={styles.rotuloCampo}>{rotulo}</span>
            <span className={styles.entrada}>
              <span aria-hidden="true">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={estado.textos[campo]}
                onChange={(evento) => onEditar(campo, evento.target.value)}
                placeholder={campo !== "site" && site !== null ? centavosParaTexto(site) : ""}
                aria-label={`${acessivel} de ${produtoNome}${campo !== "site" ? " (vazio = mesmo do site)" : ""}`}
                title={campo !== "site" ? "Vazio = usa o preço do site" : undefined}
                disabled={estado.salvando}
              />
            </span>
            {campo !== "site" && valor === null ? (
              <span className={styles.dica}>igual ao site</span>
            ) : (
              <Margem precoCentavos={valor} custoCentavos={custoCentavos} />
            )}
          </label>
        );
      })}

      <div className={styles.acaoLinha}>
        {/* Invisível: só mantém o Enter salvando a linha, já que o Salvar foi para o menu. */}
        <button type="submit" className={styles.submitOculto} tabIndex={-1} aria-hidden="true" />
        {menu}
        {estado.salvando && <span className={styles.dica}>Salvando…</span>}
        {alterado && !estado.status && !estado.salvando && <span className={styles.seloPendente}>não salvo</span>}
        {estado.status && (
          <span className={estado.status.tipo === "ok" ? styles.statusOk : styles.statusErro} role="status">
            {estado.status.texto}
          </span>
        )}
      </div>

      {(estado.ajustePendente !== null || estado.ajusteAtivo) && (
        <span className={styles.seloEvento}>
          {estado.ajustePendente !== null
            ? `ajuste do evento +${estado.ajustePendente}% · antes ${formatarPreco(estado.original.site)}`
            : `ajuste do evento ${estado.ajusteAtivo!.percentual}% · antes ${formatarPreco(estado.ajusteAtivo!.precoAnterior)}`}
        </span>
      )}
      {estado.ajustePendente === null && alterado && site !== null && site !== estado.original.site && (
        <span className={styles.dica}>antes: {formatarPreco(estado.original.site)}</span>
      )}
    </form>
  );
}
