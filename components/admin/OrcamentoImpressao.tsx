"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import styles from "./admin.module.css";
import o from "./orcamentoImpressao.module.css";
import type { CalculadoraValores } from "@/lib/models/calculoPreco";
import { montarOrcamentoProduto, type Marketplace } from "@/lib/produtos/orcamento";

export interface CalculoParaImprimir {
  id: string;
  nome: string;
  alturaCm?: string;
  valores: CalculadoraValores;
}

const CANAIS: Array<{ canal: Marketplace; rotulo: string }> = [
  { canal: "shopee", rotulo: "Shopee" },
  { canal: "mercadoLivre", rotulo: "Mercado Livre" },
];
const KITS = [2, 3, 4];

function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function decimal(n: number, casas = 1): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

/** Mesma regra da calculadora: ROAS arredondado para cima, ACOS para baixo. */
function metaAnuncio(roas: number, ehMl: boolean): string {
  if (ehMl) return `ACOS ${decimal(Math.floor((100 / roas) * 10) / 10)}%`;
  return `ROAS ${(Math.ceil(roas * 10) / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

/** Folha de orçamentos para mostrar aos sócios: canal e kit escolhidos aqui, impressão em A4 deitado. */
export default function OrcamentoImpressao({
  calculos,
  naoEncontrados,
}: {
  calculos: CalculoParaImprimir[];
  naoEncontrados: number;
}) {
  const [canal, setCanal] = useState<Marketplace>("shopee");
  const [kit, setKit] = useState(2);
  const ehMl = canal === "mercadoLivre";
  const nomeCanal = CANAIS.find((c) => c.canal === canal)!.rotulo;
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className={`container ${o.folha}`}>
      <div className={o.controles}>
        <div className={o.grupo} role="group" aria-label="Canal">
          <span>Canal</span>
          {CANAIS.map((c) => (
            <button
              key={c.canal}
              type="button"
              aria-pressed={canal === c.canal}
              className={canal === c.canal ? o.opcaoAtiva : o.opcao}
              onClick={() => setCanal(c.canal)}
            >
              {c.rotulo}
            </button>
          ))}
        </div>
        <div className={o.grupo} role="group" aria-label="Tamanho do kit">
          <span>Kit de</span>
          {KITS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kit === k}
              className={kit === k ? o.opcaoAtiva : o.opcao}
              onClick={() => setKit(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <div className={o.acoes}>
          <Link href="/admin/produtos/calculadora" className={styles.btnGhost}>
            Voltar à calculadora
          </Link>
          <button type="button" className={styles.btnPrimary} onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
        {naoEncontrados > 0 && (
          <span className={styles.fieldWarning}>
            {naoEncontrados} cálculo{naoEncontrados > 1 ? "s" : ""} marcado{naoEncontrados > 1 ? "s" : ""} não{" "}
            {naoEncontrados > 1 ? "foram encontrados" : "foi encontrado"} (excluído?) e ficou de fora.
          </span>
        )}
      </div>

      <header className={o.cabecalho}>
        <div>
          <span className={o.marca}>Voxelas Duo</span>
          <h1>Orçamentos · {nomeCanal}</h1>
        </div>
        <span className={o.data}>{hoje}</span>
      </header>
      <ul className={o.premissas}>
        <li>
          Preço para anunciar já paga a taxa do {nomeCanal}, o anúncio (Ads) na meta de cada produto e a margem de
          lucro.
        </li>
        <li>Kit = {kit} peças num pedido, com uma embalagem só.</li>
        <li>Mês = a produção de uma impressora (horas por dia do cálculo), toda vendida daquele jeito.</li>
      </ul>

      <div className={o.rolagem}>
      <table className={o.tabela}>
        <thead>
          <tr>
            <th scope="col">Produto</th>
            <th scope="col" className={o.num}>Peças / mesa</th>
            <th scope="col" className={o.num}>Horas / mesa</th>
            <th scope="col" className={o.num}>Concorrente</th>
            <th scope="col">Anúncio</th>
            <th scope="col">Venda</th>
            <th scope="col" className={o.num}>Custo do pedido</th>
            <th scope="col" className={`${o.num} ${o.colPreco}`}>Preço para anunciar</th>
            <th scope="col" className={o.num}>Lucro / pedido</th>
            <th scope="col" className={o.num}>Margem</th>
            <th scope="col" className={o.num}>Pedidos / mês</th>
            <th scope="col" className={o.num}>Faturamento / mês</th>
            <th scope="col" className={`${o.num} ${o.colLucro}`}>Lucro / mês</th>
          </tr>
        </thead>
        {calculos.map((c) => {
          const orc = montarOrcamentoProduto(c.valores, canal, kit);
          const produto = (
            <th scope="rowgroup" rowSpan={Math.max(orc.linhas.length, 1)} className={o.produto}>
              <span className={o.nomeProduto}>{c.nome}</span>
              {c.alturaCm && <span className={o.altura}>{c.alturaCm.replace(".", ",")} cm</span>}
              {orc.custoPecaCentavos !== null && (
                <span className={o.custoPeca}>peça custa {reais(orc.custoPecaCentavos)}</span>
              )}
            </th>
          );
          const doProduto = (
            <>
              <td rowSpan={Math.max(orc.linhas.length, 1)} className={o.num}>
                {orc.pecasPorMesa !== null ? decimal(orc.pecasPorMesa, 0) : "—"}
              </td>
              <td rowSpan={Math.max(orc.linhas.length, 1)} className={o.num}>
                {orc.horasMesaCheia !== null ? `${decimal(orc.horasMesaCheia, 2)} h` : "—"}
              </td>
              <td rowSpan={Math.max(orc.linhas.length, 1)} className={o.num}>
                {orc.precoConcorrenteCentavos !== null ? reais(orc.precoConcorrenteCentavos) : "—"}
              </td>
              <td rowSpan={Math.max(orc.linhas.length, 1)}>{metaAnuncio(orc.roas, ehMl)}</td>
            </>
          );

          if (orc.linhas.length === 0) {
            return (
              <tbody key={c.id} className={o.grupoProduto}>
                <tr>
                  {produto}
                  {doProduto}
                  <td colSpan={8} className={o.falta}>
                    Falta custo: abra o cálculo e preencha tempo de impressão e filamento usado.
                  </td>
                </tr>
              </tbody>
            );
          }

          return (
            <tbody key={c.id} className={o.grupoProduto}>
              {orc.linhas.map((l, i) => (
                <tr key={l.unidades}>
                  {i === 0 && (
                    <>
                      {produto}
                      {doProduto}
                    </>
                  )}
                  <td className={o.venda}>{l.unidades === 1 ? "Avulso" : `Kit ${l.unidades}`}</td>
                  <td className={o.num}>{reais(l.custoPedidoCentavos)}</td>
                  {l.precoCentavos === null ? (
                    <td colSpan={6} className={o.falta}>
                      Sem preço possível: taxa + anúncio + {decimal(orc.margemPercentual)}% de margem passam de 100%.
                    </td>
                  ) : (
                    <Fragment>
                      <td className={`${o.num} ${o.colPreco}`}>
                        <strong>{reais(l.precoCentavos)}</strong>
                        {l.unidades > 1 && (
                          <span className={o.cada}>{reais(Math.ceil(l.precoCentavos / l.unidades))} cada</span>
                        )}
                      </td>
                      <td className={`${o.num} ${l.lucroPedidoCentavos < 0 ? o.negativo : ""}`}>
                        {reais(l.lucroPedidoCentavos)}
                      </td>
                      <td className={o.num}>{decimal(l.margemPercentual, 0)}%</td>
                      <td className={o.num}>{l.pedidosMes !== null ? l.pedidosMes.toLocaleString("pt-BR") : "—"}</td>
                      <td className={o.num}>
                        {l.faturamentoMesCentavos !== null ? reais(l.faturamentoMesCentavos) : "—"}
                      </td>
                      <td className={`${o.num} ${o.colLucro} ${(l.lucroMesCentavos ?? 0) < 0 ? o.negativo : ""}`}>
                        {l.lucroMesCentavos !== null ? reais(l.lucroMesCentavos) : "—"}
                      </td>
                    </Fragment>
                  )}
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
      </div>
      <p className={o.rodape}>
        Valores calculados na calculadora de preço com o custo, a margem e a meta de anúncio salvos em cada produto.
        Pedidos sem produção informada aparecem com “—”.
      </p>
    </div>
  );
}
