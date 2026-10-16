"use client";

import styles from "../admin.module.css";
import calc from "../calculadoraRapida.module.css";
import type { AnuncioCalculadoraValores } from "@/lib/models/calculoPreco";
import {
  calcularCustoKit,
  calcularCustoMaximo,
  calcularLimiteAnuncio,
  calcularPrecoPorMargem,
  calcularRetornoVerba,
  compararComConcorrente,
  detalharVenda,
} from "@/lib/produtos/calculadoraRapida";
import type { ResultadoCalculadora, ResultadoCanal } from "@/lib/produtos/resultadoCalculadora";
import { formatarAcos, formatarRoas, reais } from "./formato";

/**
 * O que digitar na tela de criar campanha: a meta (ROAS na Shopee, ACOS no
 * Mercado Livre) e o orçamento diário em R$ — um valor de teste para começar e
 * o teto que vende a produção do mês inteira pelo anúncio (acima disso falta peça).
 */
function PreencherCampanha({
  ehMl,
  roas,
  custoPorVendaCentavos,
  pecasMes,
  diasMes,
  verbaMesCentavos,
  onUsarVerba,
}: {
  ehMl: boolean;
  roas: number;
  custoPorVendaCentavos: number;
  pecasMes: number;
  diasMes: number;
  verbaMesCentavos?: number;
  onUsarVerba?: (reais: string) => void;
}) {
  const dias = diasMes > 0 ? diasMes : 30;
  const tetoMensalCentavos = pecasMes > 0 ? custoPorVendaCentavos * pecasMes : 0;
  const tetoDiarioCentavos = Math.round(tetoMensalCentavos / dias);
  const inicioDiarioCentavos = tetoDiarioCentavos > 0 ? Math.min(1500, tetoDiarioCentavos) : 1000;
  const verbaDiariaCentavos = verbaMesCentavos ? Math.round(verbaMesCentavos / dias) : 0;
  const plataforma = ehMl ? "Mercado Ads" : "Shopee Ads";

  return (
    <div className={calc.verbaSugerida}>
      <strong>O que digitar ao criar a campanha no {plataforma}:</strong>
      <ol className={calc.passosCampanha}>
        <li>
          No campo <em>{ehMl ? "ACOS objetivo" : "Meta de ROAS"}</em>, digite{" "}
          <strong className={calc.valorCampanha}>{ehMl ? formatarAcos(roas) : formatarRoas(roas)}</strong>
        </li>
        <li>
          No campo <em>Orçamento diário</em>, digite{" "}
          {verbaDiariaCentavos > 0 ? (
            <>
              <strong className={calc.valorCampanha}>{reais(verbaDiariaCentavos)}</strong> (sua verba de {reais(verbaMesCentavos!)} ÷ {dias} dias)
            </>
          ) : (
            <>
              <strong className={calc.valorCampanha}>{reais(inicioDiarioCentavos)}</strong> para começar
            </>
          )}
        </li>
      </ol>
      <span className={styles.mlLinkAviso}>
        Cada venda pelo anúncio gasta ~{reais(custoPorVendaCentavos)}.
        {tetoDiarioCentavos > 0 &&
          ` Depois de 7 a 15 dias, se o ROAS real estiver no verde, pode subir o orçamento até ${reais(tetoDiarioCentavos)}/dia (${reais(tetoMensalCentavos)}/mês) — é o que vende as ${pecasMes} peças do mês. Mais que isso falta peça.`}
      </span>
      {onUsarVerba && tetoMensalCentavos > 0 && (
        <button type="button" className={styles.btnGhost} onClick={() => onUsarVerba(((inicioDiarioCentavos * dias) / 100).toFixed(2))}>
          Usar {reais(inicioDiarioCentavos)}/dia ({reais(inicioDiarioCentavos * dias)}/mês) como verba
        </button>
      )}
    </div>
  );
}

interface Contexto {
  ehMl: boolean;
  r: ResultadoCanal;
  res: ResultadoCalculadora;
  anuncio: AnuncioCalculadoraValores;
  verbaCentavos: number;
  diasMes: number;
}

/** Anúncio embutido (passo a passo, tabela de ROAS, semáforo) ou do bolso (retorno da verba). */
export function AnuncioCanal({
  ehMl,
  r,
  res,
  anuncio,
  verbaCentavos,
  diasMes,
  onEscolherRoas,
  onUsarVerba,
}: Contexto & { onEscolherRoas: (roas: string) => void; onUsarVerba: (reais: string) => void }) {
  const roas = res.roas;
  const margem = res.margemPercentual;
  if (roas === null || margem === null || !r.venda || r.precoCentavos === null) return null;

  if (anuncio.modo === "embutido") {
    return (
      <div className={calc.anuncio}>
        <strong>Anúncio pago pelo comprador (já está no preço)</strong>
        <PreencherCampanha ehMl={ehMl} roas={roas} custoPorVendaCentavos={r.venda.anuncioCentavos} pecasMes={res.pecasMes} diasMes={diasMes} />
        <div className={calc.tabelaRoas}>
          <strong>Quer um preço menor? Suba a Meta de ROAS</strong>
          <span className={styles.mlLinkAviso}>
            ROAS maior = menos anúncio por venda = preço menor. Mas a {ehMl ? "plataforma" : "Shopee"} mostra menos o produto.
          </span>
          {[5, 8, 10, 15, 20].map((opcao) => {
            const preco = calcularPrecoPorMargem({
              custoCentavos: r.custoPedidoCentavos,
              faixas: r.canal.faixas,
              margemPrecoPercentual: margem,
              anuncioPercentual: 100 / opcao,
              impostoPercentual: res.impostoPercentual,
            });
            if (preco === null) return null;
            return (
              <button key={opcao} type="button" className={opcao === roas ? calc.opcaoRoasAtual : calc.opcaoRoas} onClick={() => onEscolherRoas(String(opcao))}>
                <span>{ehMl ? `ACOS ${formatarAcos(opcao)}` : `ROAS ${opcao}`}</span>
                <strong>{reais(preco)}</strong>
              </button>
            );
          })}
          {r.precoSemAnuncioCentavos !== null && <span className={styles.mlLinkAviso}>Sem anúncio: {reais(r.precoSemAnuncioCentavos)}</span>}
        </div>
        <strong>Depois, confira o ROAS real no painel:</strong>
        <span className={calc.semaforoVerde}>
          ROAS real {formatarRoas(roas)} ou mais: você ganha {margem}% ou mais
        </span>
        {r.limite?.roasPrejuizo != null && (
          <>
            <span className={calc.semaforoAmarelo}>
              Entre {formatarRoas(r.limite.roasPrejuizo)} e {formatarRoas(roas)}: lucra, mas menos de {margem}%
            </span>
            <span className={calc.roasPrejuizo}>Abaixo de {formatarRoas(r.limite.roasPrejuizo)}: prejuízo. Pause o anúncio.</span>
          </>
        )}
      </div>
    );
  }

  if (anuncio.modo === "bolso") {
    const custoVenda = Math.round(r.precoCentavos / roas);
    const retorno = calcularRetornoVerba({ verbaCentavos, roas, precoCentavos: r.precoCentavos, lucroPorPecaCentavos: r.venda.lucroCentavos });
    return (
      <div className={calc.anuncio}>
        <strong>Anúncio pago do seu bolso</strong>
        <PreencherCampanha
          ehMl={ehMl}
          roas={roas}
          custoPorVendaCentavos={custoVenda}
          pecasMes={res.pecasMes}
          diasMes={diasMes}
          verbaMesCentavos={verbaCentavos}
          onUsarVerba={onUsarVerba}
        />
        <span>
          Cada venda pelo anúncio custa ~{reais(custoVenda)} e deixa ~<strong>{reais(r.venda.lucroCentavos - custoVenda)}</strong> de lucro
        </span>
        {verbaCentavos > 0 ? (
          <>
            <span>
              {reais(verbaCentavos)} devem trazer ~<strong>{retorno.vendas} vendas</strong> ({reais(retorno.receitaCentavos)})
            </span>
            <span className={retorno.saldoCentavos >= 0 ? calc.semaforoVerde : calc.roasPrejuizo}>
              Lucro dessas vendas {reais(retorno.lucroVendasCentavos)} − verba {reais(verbaCentavos)} = {reais(retorno.saldoCentavos)}
            </span>
            {retorno.vendas > res.pecasMes && res.pecasMes > 0 && (
              <span className={calc.semaforoAmarelo}>Mais vendas que a sua produção do mês ({res.pecasMes} peças).</span>
            )}
          </>
        ) : (
          <span className={styles.mlLinkAviso}>Informe a verba do mês para ver o retorno.</span>
        )}
        {retorno.roasEquilibrio !== null && (
          <span className={calc.roasPrejuizo}>ROAS real abaixo de {formatarRoas(retorno.roasEquilibrio)}: o anúncio não se paga. Pause.</span>
        )}
      </div>
    );
  }
  return null;
}

function precosKits(r: ResultadoCanal, res: ResultadoCalculadora) {
  const custo = res.custo!;
  return [2, 3, 4].map((unidades) => {
    const custoPedido = calcularCustoKit(custo.totalCentavos, custo.embalagemCentavos, unidades) + r.canal.custoVendaCentavos;
    return {
      unidades,
      custoPedido,
      preco:
        res.margemPercentual !== null
          ? calcularPrecoPorMargem({
              custoCentavos: custoPedido,
              faixas: r.canal.faixas,
              margemPrecoPercentual: res.margemPercentual,
              anuncioPercentual: r.anuncioPercentual,
              impostoPercentual: res.impostoPercentual,
            })
          : null,
    };
  });
}

/** Contra o concorrente: comparativo pagando o ROAS, lucro no preço dele, custo máximo e kit que bate. */
export function ConcorrenteCanal({
  ehMl,
  r,
  res,
  anuncio,
  precoConcorrenteCentavos,
  precoOfertaCentavos,
}: Omit<Contexto, "verbaCentavos" | "diasMes"> & { precoConcorrenteCentavos: number; precoOfertaCentavos: number }) {
  const margem = res.margemPercentual;
  if (precoConcorrenteCentavos <= 0 || margem === null || !res.custo) return null;

  const faixas = r.canal.faixas;
  const custo = r.custoPedidoCentavos;
  const imposto = res.impostoPercentual;
  const base = { faixas, custoCentavos: custo, anuncioPercentual: r.anuncioPercentual, impostoPercentual: imposto };
  const roasComparar = res.roas ?? 8;
  const precosDele = [
    { rotulo: "Normal", centavos: precoConcorrenteCentavos },
    ...(precoOfertaCentavos > 0 ? [{ rotulo: "Oferta relâmpago", centavos: precoOfertaCentavos }] : []),
  ];
  const vendaNoPreco = detalharVenda({ ...base, precoCentavos: precoConcorrenteCentavos });
  const custoMaximo =
    calcularCustoMaximo({ precoCentavos: precoConcorrenteCentavos, faixas, anuncioPercentual: r.anuncioPercentual, margemPrecoPercentual: margem, impostoPercentual: imposto }) -
    r.canal.custoVendaCentavos;
  const precoMinimo = calcularPrecoPorMargem({ ...base, margemPrecoPercentual: 0 });
  const vendaSemAnuncio = detalharVenda({ ...base, anuncioPercentual: 0, precoCentavos: precoConcorrenteCentavos });
  const limite = calcularLimiteAnuncio({
    precoCentavos: precoConcorrenteCentavos,
    taxaCentavos: vendaSemAnuncio.taxaCentavos + vendaSemAnuncio.impostoCentavos,
    custoCentavos: custo,
    margemMinimaPrecoPercentual: margem,
  });
  const kitQueBate = precosKits(r, res).find((k) => k.preco !== null && Math.ceil(k.preco / k.unidades) <= precoConcorrenteCentavos);

  return (
    <div className={calc.concorrente}>
      <strong>Contra o concorrente ({reais(precoConcorrenteCentavos)})</strong>
      <span className={styles.mlLinkAviso}>
        Comparativo pagando anúncio com {ehMl ? `ACOS ${formatarAcos(roasComparar)}` : `ROAS ${formatarRoas(roasComparar)}`}
        {anuncio.modo === "embutido" ? "" : " (a sua meta, mesmo sem anúncio escolhido)"}.
      </span>
      <div className={calc.tabelaKitsRolagem}>
        <table className={calc.tabelaKits}>
          <thead>
            <tr>
              <th scope="col">Preço dele</th>
              <th scope="col">Nosso com {margem}%</th>
              <th scope="col">Para igualar o dele</th>
            </tr>
          </thead>
          <tbody>
            {precosDele.map((p) => {
              const c = compararComConcorrente({
                precoConcorrenteCentavos: p.centavos,
                custoCentavos: custo,
                faixas,
                roas: roasComparar,
                margemPrecoPercentual: margem,
                impostoPercentual: imposto,
              });
              const ganhamos = c.diferencaCentavos !== null && c.diferencaCentavos <= 0;
              return (
                <tr key={p.rotulo}>
                  <th scope="row">
                    {reais(p.centavos)}
                    <span className={calc.cadaUm}>{p.rotulo}</span>
                  </th>
                  <td>
                    {c.nossoPrecoCentavos !== null ? reais(c.nossoPrecoCentavos) : "impossível"}
                    {c.diferencaCentavos !== null && (
                      <span className={ganhamos ? calc.ganhamos : calc.perdemos}>
                        {ganhamos ? `${reais(-c.diferencaCentavos)} mais barato` : `${reais(c.diferencaCentavos)} mais caro`}
                      </span>
                    )}
                  </td>
                  <td>
                    {ganhamos ? (
                      <span className={calc.ganhamos}>Já ganhamos. No preço dele a margem sobe para {c.margemNoPrecoDelePercentual.toFixed(0)}%</span>
                    ) : c.lucroNoPrecoDeleCentavos > 0 ? (
                      <span>
                        Baixar a margem para <strong>{Math.floor(c.margemNoPrecoDelePercentual)}%</strong> ({reais(c.lucroNoPrecoDeleCentavos)} por peça)
                      </span>
                    ) : (
                      <span className={calc.perdemos}>
                        Não dá: com esse anúncio o mínimo sem lucro é {c.precoEmpateCentavos !== null ? reais(c.precoEmpateCentavos) : "impossível"}. Suba o ROAS ou baixe o custo.
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <span className={vendaNoPreco.lucroCentavos >= 0 ? undefined : calc.roasPrejuizo}>
        Vendendo por {reais(precoConcorrenteCentavos)} você {vendaNoPreco.lucroCentavos >= 0 ? "ganha" : "perde"}{" "}
        <strong>{reais(Math.abs(vendaNoPreco.lucroCentavos))}</strong> por peça ({vendaNoPreco.margemPrecoPercentual.toFixed(0)}%)
      </span>
      {precoOfertaCentavos > 0 &&
        (() => {
          const v = detalharVenda({ ...base, precoCentavos: precoOfertaCentavos });
          return (
            <span className={v.lucroCentavos >= 0 ? calc.semaforoAmarelo : calc.roasPrejuizo}>
              Na oferta relâmpago dele ({reais(precoOfertaCentavos)}) você {v.lucroCentavos >= 0 ? "ainda ganharia" : "perderia"}{" "}
              <strong>{reais(Math.abs(v.lucroCentavos))}</strong> por peça ({v.margemPrecoPercentual.toFixed(0)}%)
            </span>
          );
        })()}
      {precoMinimo !== null && <span>Abaixo de {reais(precoMinimo)} você tem prejuízo.</span>}
      {limite.roasMinimo !== null ? (
        <span className={calc.semaforoVerde}>
          Vendendo no preço dele com {margem}% de lucro, dá para anunciar com{" "}
          {ehMl ? `ACOS objetivo até ${formatarAcos(limite.roasMinimo)}` : `Meta de ROAS ${formatarRoas(limite.roasMinimo)}`} (até{" "}
          {reais(limite.tetoAnuncioCentavos)} de anúncio por venda).
        </span>
      ) : (
        <span className={calc.semaforoAmarelo}>No preço dele não sobra nada para anúncio com {margem}% de lucro.</span>
      )}
      <span>
        Para ganhar {margem}% nesse preço, sua peça teria que custar{" "}
        {custoMaximo > 0 ? (
          <>
            no máximo <strong>{reais(custoMaximo)}</strong> (hoje custa {reais(res.custo.totalCentavos)})
          </>
        ) : (
          <strong>menos que zero — impossível</strong>
        )}
      </span>
      {r.precoCentavos !== null && r.precoCentavos > precoConcorrenteCentavos && (
        <span className={kitQueBate ? calc.semaforoVerde : calc.semaforoAmarelo}>
          {kitQueBate
            ? `Kit com ${kitQueBate.unidades} sai ${reais(Math.ceil(kitQueBate.preco! / kitQueBate.unidades))} cada, com seus ${margem}% — mais barato que ele por unidade.`
            : "Nem em kit fica mais barato que ele por unidade. Concorra com qualidade, fotos e cores, não com preço."}
        </span>
      )}
    </div>
  );
}

/** Avulso no preço praticado e kits 2/3/4 pela margem, com bruto e líquido no mês. */
export function KitsCanal({
  r,
  res,
  anuncio,
  verbaCentavos,
}: {
  r: ResultadoCanal;
  res: ResultadoCalculadora;
  anuncio: AnuncioCalculadoraValores;
  verbaCentavos: number;
}) {
  if (!res.custo || r.precoCentavos === null) return null;
  const verba = anuncio.modo === "bolso" && r.canal.canal !== "direta" ? verbaCentavos : 0;
  const linhas = [{ unidades: 1, custoPedido: r.custoPedidoCentavos, preco: r.precoCentavos as number | null }, ...precosKits(r, res)];

  return (
    <div className={calc.kits}>
      <strong>Avulso ou em kit? (kit usa uma embalagem só)</strong>
      <span className={styles.mlLinkAviso}>
        Mês = as {res.pecasMes} peças da produção vendidas desse jeito{verba > 0 ? ", já tirando a verba do bolso" : ""}.
      </span>
      <div className={calc.tabelaKitsRolagem}>
        <table className={calc.tabelaKits}>
          <thead>
            <tr>
              <th scope="col">Venda</th>
              <th scope="col">Preço</th>
              <th scope="col">Lucro / pedido</th>
              <th scope="col">Lucro / peça</th>
              <th scope="col">Bruto no mês</th>
              <th scope="col">Líquido no mês</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((k) => {
              if (k.preco === null) return null;
              const lucroPedido = detalharVenda({
                precoCentavos: k.preco,
                faixas: r.canal.faixas,
                custoCentavos: k.custoPedido,
                anuncioPercentual: r.anuncioPercentual,
                impostoPercentual: res.impostoPercentual,
              }).lucroCentavos;
              const pedidosMes = Math.floor(res.pecasMes / k.unidades);
              const liquidoMes = lucroPedido * pedidosMes - verba;
              return (
                <tr key={k.unidades}>
                  <th scope="row">{k.unidades === 1 ? "Avulso" : `Kit ${k.unidades}`}</th>
                  <td>
                    {reais(k.preco)}
                    {k.unidades > 1 && <span className={calc.cadaUm}>{reais(Math.ceil(k.preco / k.unidades))} cada</span>}
                  </td>
                  <td>{reais(lucroPedido)}</td>
                  <td>{reais(Math.round(lucroPedido / k.unidades))}</td>
                  <td>{reais(k.preco * pedidosMes)}</td>
                  <td className={liquidoMes < 0 ? calc.roasPrejuizo : undefined}>
                    <strong>{reais(liquidoMes)}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
