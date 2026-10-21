"use client";

import { useState } from "react";
import { custoEfetivo, precoEfetivo, resumirItem } from "@/lib/controleVendas/calculo";
import { centavosParaCampo, reaisParaCentavos } from "@/lib/controleVendas/formato";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import type { ItemControleJson, ProducaoControlePayload, VendaControlePayload } from "@/lib/models/controleVendas";
import { formatarPreco } from "@/lib/produtos/formato";
import LinhaVenda from "./LinhaVenda";
import styles from "./controleVendas.module.css";

/**
 * Um produto: produção e preços editáveis no cabeçalho, a régua produzido ×
 * vendido e, aberto, a tabela de vendas com a linha de lançamento rápido.
 * Borda vermelha quando o estoque do site zerou.
 */
export default function CartaoProduto({
  item,
  taxas,
  aoSalvarProducao,
  aoLancarVenda,
  aoEditarVenda,
  aoExcluirVenda,
}: {
  item: ItemControleJson;
  taxas: TaxasCanaisConfig;
  aoSalvarProducao: (dados: ProducaoControlePayload) => Promise<boolean>;
  aoLancarVenda: (dados: VendaControlePayload) => Promise<boolean>;
  aoEditarVenda: (vendaId: string, dados: VendaControlePayload) => Promise<boolean>;
  aoExcluirVenda: (vendaId: string) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [produzido, setProduzido] = useState(String(item.produzido));
  const [custo, setCusto] = useState(centavosParaCampo(item.custoUnitarioCentavos));
  const [preco, setPreco] = useState(centavosParaCampo(item.precoVendaCentavos));

  const resumo = resumirItem(item);
  const semEstoque = item.estoque <= 0;
  const escala = Math.max(item.produzido, resumo.vendidos, 1);

  async function salvarProducao() {
    const quantidade = Number(produzido);
    const custoCentavos = custo.trim() ? reaisParaCentavos(custo) : null;
    const precoCentavos = preco.trim() ? reaisParaCentavos(preco) : null;
    const mudou =
      quantidade !== item.produzido ||
      custoCentavos !== item.custoUnitarioCentavos ||
      precoCentavos !== item.precoVendaCentavos;
    if (!mudou) return;
    // Número que não fecha também vai: o servidor responde 400 e a mensagem aparece na tela.
    const ok = await aoSalvarProducao({
      produzido: Number.isInteger(quantidade) ? quantidade : -1,
      custoUnitarioCentavos: custo.trim() && custoCentavos === null ? -1 : custoCentavos,
      precoVendaCentavos: preco.trim() && precoCentavos === null ? -1 : precoCentavos,
    });
    if (!ok) {
      setProduzido(String(item.produzido));
      setCusto(centavosParaCampo(item.custoUnitarioCentavos));
      setPreco(centavosParaCampo(item.precoVendaCentavos));
    }
  }

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  return (
    <article className={`${styles.cartao} ${semEstoque ? styles.cartaoSemEstoque : ""}`}>
      <div className={styles.cabecalhoCartao}>
        <div className={styles.identidade}>
          {item.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.foto} alt="" className={styles.foto} />
          ) : (
            <span className={styles.fotoVazia} aria-hidden="true" />
          )}
          <div>
            <h2 className={styles.nome}>{item.nome}</h2>
            <span className={semEstoque ? styles.seloSemEstoque : styles.seloEstoque}>
              {semEstoque ? "Sem estoque no site" : `${item.estoque} no estoque do site`}
            </span>
          </div>
        </div>

        <div className={styles.camposProducao}>
          <label className={styles.rotulo}>
            Produzido
            <input
              type="number"
              min={0}
              className={`${styles.campo} ${styles.campoCurto}`}
              value={produzido}
              onChange={(e) => setProduzido(e.target.value)}
              onBlur={salvarProducao}
              onKeyDown={aoTeclar}
            />
          </label>
          <label className={styles.rotulo}>
            Custo por peça
            <input
              inputMode="decimal"
              className={`${styles.campo} ${styles.campoValor}`}
              value={custo}
              placeholder={centavosParaCampo(item.custoCadastroCentavos) || "0,00"}
              onChange={(e) => setCusto(e.target.value)}
              onBlur={salvarProducao}
              onKeyDown={aoTeclar}
            />
          </label>
          <label className={styles.rotulo}>
            Vendo por
            <input
              inputMode="decimal"
              className={`${styles.campo} ${styles.campoValor}`}
              value={preco}
              placeholder={centavosParaCampo(item.precoSiteCentavos)}
              onChange={(e) => setPreco(e.target.value)}
              onBlur={salvarProducao}
              onKeyDown={aoTeclar}
            />
          </label>
        </div>

        <div className={styles.lucroCartao}>
          <span className={styles.rotuloPequeno}>Lucro</span>
          <strong className={resumo.lucroCentavos < 0 ? styles.prejuizo : styles.lucro}>
            {formatarPreco(resumo.lucroCentavos)}
          </strong>
          <span className={styles.rotuloPequeno}>
            {formatarPreco(custoEfetivo(item))} → {formatarPreco(precoEfetivo(item))}
          </span>
        </div>
      </div>

      <div className={styles.regua} aria-hidden="true">
        <span className={styles.reguaVendido} style={{ width: `${(resumo.vendidos / escala) * 100}%` }} />
      </div>

      <div className={styles.rodapeCartao}>
        <span>
          <strong>{resumo.vendidos}</strong> vendidos de <strong>{item.produzido}</strong> produzidos · saldo{" "}
          <strong>{resumo.saldo}</strong>
        </span>
        <button
          type="button"
          className={styles.botaoAbrir}
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
        >
          {aberto ? "Fechar vendas" : item.vendas.length ? `Vendas (${item.vendas.length})` : "+ Lançar venda"}
        </button>
      </div>

      {/* Fechado continua no HTML: a impressão abre todas as vendas. */}
      <div className={`${styles.vendas} ${aberto ? styles.vendasAbertas : ""} ${item.vendas.length ? "" : styles.semVendas}`}>
        <div className={styles.rolagemTabela}>
          <table className={styles.tabelaVendas}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Qtd</th>
                <th>Cliente</th>
                <th>Canal</th>
                <th>Preço un.</th>
                <th>Taxa %</th>
                <th>Taxa fixa</th>
                <th>Extras</th>
                <th title="Baixar do estoque do site">Baixa</th>
                <th>Lucro</th>
                <th className={styles.colunaAcoes}>
                  <span className={styles.somenteLeitor}>Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {item.vendas.map((venda) => (
                <LinhaVenda
                  key={venda.id}
                  item={item}
                  taxas={taxas}
                  venda={venda}
                  aoSalvar={(dados) => aoEditarVenda(venda.id, dados)}
                  aoRemover={() => aoExcluirVenda(venda.id)}
                />
              ))}
              <LinhaVenda item={item} taxas={taxas} aoSalvar={aoLancarVenda} />
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
