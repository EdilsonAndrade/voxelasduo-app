"use client";

import type { ReactNode } from "react";
import styles from "../admin.module.css";
import calc from "../calculadoraRapida.module.css";
import type { AnuncioCalculadoraValores } from "@/lib/models/calculoPreco";
import { NOME_CANAL, type CanalVenda } from "@/lib/produtos/canaisCalculadora";
import type { CustoUnidade } from "@/lib/produtos/custoCalculadora";
import { CANAIS_VENDA, type ResultadoCalculadora } from "@/lib/produtos/resultadoCalculadora";
import { detalharVenda } from "@/lib/produtos/calculadoraRapida";
import { calcularVerbaDesconto, descontoMaximoNoPiso, type CupomLoja } from "@/lib/produtos/verbaDesconto";
import VerbaDesconto from "../VerbaDesconto";
import { AnuncioCanal, ConcorrenteCanal, KitsCanal } from "./BlocosCanal";
import { numero, porcentagem, reais } from "./formato";

/** Camadas da composição do custo, na ordem em que a peça "é construída". */
const CAMADAS: Array<{ chave: keyof CustoUnidade; rotulo: string; cor: string }> = [
  { chave: "materialCentavos", rotulo: "Material", cor: "var(--roxo)" },
  { chave: "energiaCentavos", rotulo: "Energia", cor: "var(--amarelo)" },
  { chave: "desgasteCentavos", rotulo: "Desgaste da máquina", cor: "var(--turquesa)" },
  { chave: "falhaCentavos", rotulo: "Reserva de falha", cor: "var(--laranja)" },
  { chave: "embalagemCentavos", rotulo: "Embalagem", cor: "var(--rosa)" },
  { chave: "acabamentoCentavos", rotulo: "Acabamento", cor: "color-mix(in srgb, var(--roxo) 55%, var(--turquesa))" },
  { chave: "maoDeObraCentavos", rotulo: "Mão de obra", cor: "color-mix(in srgb, var(--laranja) 60%, var(--rosa))" },
  { chave: "outrosCentavos", rotulo: "Outros", cor: "var(--texto-soft)" },
];

/** Lucro do dia e do mês vendendo tudo num mesmo preço (com desconto máximo ou cheio). */
function FaixaPotencial({
  titulo,
  lucroPeca,
  recebidoPeca,
  rotuloRecebido,
  pecasDia,
  pecasMes,
  verbaCentavos,
  apoioDia,
}: {
  titulo: string;
  lucroPeca: number;
  /** O que o canal deposita por peça (preço − taxas do pedido) — `null` = não se aplica. */
  recebidoPeca: number | null;
  rotuloRecebido: string;
  pecasDia: number;
  pecasMes: number;
  verbaCentavos: number;
  apoioDia: string;
}) {
  const mes = lucroPeca * pecasMes - verbaCentavos;
  // Recebido → lucro: o que sai do depósito é custo da peça, anúncio, imposto (e a verba no mês).
  const conta = (pecas: number, verba: number) =>
    recebidoPeca === null ? null : (
      <small>
        {rotuloRecebido} {reais(recebidoPeca * pecas)} − custos {reais(recebidoPeca * pecas - lucroPeca * pecas + verba)}
      </small>
    );
  return (
    <div className={calc.potencialFaixa}>
      <span className={calc.potencialTitulo}>{titulo}</span>
      <div className={calc.potencialGrade}>
        {pecasDia > 0 && (
          <div>
            <span>Lucro por dia</span>
            <strong className={lucroPeca < 0 ? calc.precoPrejuizo : undefined}>{reais(lucroPeca * pecasDia)}</strong>
            {conta(pecasDia, 0)}
            <small>
              {pecasDia} peças · {apoioDia}
            </small>
          </div>
        )}
        {pecasMes > 0 && (
          <div>
            <span>Lucro por mês{verbaCentavos > 0 ? " (− verba)" : ""}</span>
            <strong className={mes < 0 ? calc.precoPrejuizo : undefined}>{reais(mes)}</strong>
            {conta(pecasMes, verbaCentavos)}
            <small>{pecasMes} peças</small>
          </div>
        )}
      </div>
    </div>
  );
}

function Estatistica({ rotulo, valor, apoio, destaque }: { rotulo: string; valor: ReactNode; apoio?: ReactNode; destaque?: "bom" | "ruim" }) {
  return (
    <div className={`${calc.estatistica} ${destaque === "bom" ? calc.estatisticaBoa : destaque === "ruim" ? calc.estatisticaRuim : ""}`}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
      {apoio}
    </div>
  );
}

/** Custo de uma peça em destaque no topo do resumo — aparece assim que a impressão está preenchida. */
function CustoPeca({ custo, custoCadastroCentavos }: { custo: CustoUnidade; custoCadastroCentavos: number | null }) {
  const impressao = custo.energiaCentavos + custo.desgasteCentavos + custo.falhaCentavos;
  const extras = custo.embalagemCentavos + custo.acabamentoCentavos + custo.maoDeObraCentavos + custo.outrosCentavos;
  const diferenca = custoCadastroCentavos !== null ? custo.totalCentavos - custoCadastroCentavos : 0;
  return (
    <div className={calc.custoPeca}>
      <span>Custo da peça</span>
      <strong>{reais(custo.totalCentavos)}</strong>
      <small>
        Material {reais(custo.materialCentavos)} · Impressão {reais(impressao)} · Extras {reais(extras)} ·{" "}
        <a href="#composicao-custo">ver composição</a>
      </small>
      {custoCadastroCentavos !== null && (
        <small>
          No cadastro do produto: <b>{reais(custoCadastroCentavos)}</b>
          {Math.abs(diferenca) >= 1 && ` (${diferenca > 0 ? "+" : "−"}${reais(Math.abs(diferenca))} aqui)`}
        </small>
      )}
    </div>
  );
}

function Composicao({ custo }: { custo: CustoUnidade }) {
  const camadas = CAMADAS.map((c) => ({ ...c, centavos: custo[c.chave] as number })).filter((c) => c.centavos > 0);
  const total = custo.totalCentavos || 1;
  return (
    <div className={calc.composicao} id="composicao-custo">
      <span className={calc.rotuloGrupo}>Composição do custo por unidade</span>
      <div className={calc.camadas} role="img" aria-label={camadas.map((c) => `${c.rotulo} ${reais(c.centavos)}`).join(", ")}>
        {camadas.map((c) => (
          <span key={c.chave} style={{ flexGrow: c.centavos, background: c.cor }} title={`${c.rotulo}: ${reais(c.centavos)}`} />
        ))}
      </div>
      <ul className={calc.legendaCamadas}>
        {camadas.map((c) => (
          <li key={c.chave}>
            <i style={{ background: c.cor }} aria-hidden="true" />
            <span>{c.rotulo}</span>
            <small>{Math.round((c.centavos / total) * 100)}%</small>
            <strong>{reais(c.centavos)}</strong>
          </li>
        ))}
        <li className={calc.legendaTotal}>
          <span>Custo por unidade</span>
          <strong>{reais(custo.totalCentavos)}</strong>
        </li>
      </ul>
    </div>
  );
}

export default function Resumo({
  res,
  aba,
  setAba,
  anuncio,
  diasMes,
  precoConcorrenteReais,
  precoOfertaReais,
  onEscolherRoas,
  onUsarVerba,
  rodape,
  custoCadastroCentavos = null,
  pisoPercentual,
  cupomLoja,
}: {
  res: ResultadoCalculadora;
  aba: CanalVenda;
  setAba: (canal: CanalVenda) => void;
  anuncio: AnuncioCalculadoraValores;
  diasMes: number;
  precoConcorrenteReais: string;
  precoOfertaReais: string;
  onEscolherRoas: (roas: string) => void;
  onUsarVerba: (reais: string) => void;
  rodape: ReactNode;
  /** Custo salvo no produto ligado ao cálculo, para comparar — `null` = sem produto ou sem custo. */
  custoCadastroCentavos?: number | null;
  /** Piso de lucro global (% do preço) — base da verba de desconto (spec 034). */
  pisoPercentual: number;
  /** Cupom de loja global — entra só na aba Shopee. */
  cupomLoja: CupomLoja | null;
}) {
  const r = res.canais[aba];
  const pronto = res.custo !== null && r?.venda != null;
  const verbaCentavos = anuncio.modo === "bolso" ? Math.round((numero(anuncio.verbaMesReais) || 0) * 100) : 0;
  const verbaCanal = aba === "direta" ? 0 : verbaCentavos;
  const ehMl = aba === "mercadoLivre";
  const concorrenteCentavos = Math.round((numero(precoConcorrenteReais) || 0) * 100);
  const ofertaCentavos = Math.round((numero(precoOfertaReais) || 0) * 100);

  let corpo: ReactNode;
  if (!res.custo) {
    corpo = (
      <div className={calc.resumoVazio}>
        <strong>Preencha a impressão para ver o preço.</strong>
        <span>Falta: {res.faltando.join(", ")}.</span>
      </div>
    );
  } else if (!r) {
    corpo = <span className={styles.fieldError}>Há uma taxa digitada inválida em {NOME_CANAL[aba]}. Confira em Canal de venda.</span>;
  } else if (r.precoCentavos === null || !r.venda) {
    corpo = (
      <div className={calc.resumoVazio}>
        {res.modo === "alvo" ? (
          <strong>Digite o preço alvo em Precificação.</strong>
        ) : res.margemPercentual === null ? (
          <strong>Informe quanto quer ganhar em Precificação.</strong>
        ) : (
          <span className={styles.fieldError}>
            Não existe preço que pague taxas{r.anuncioPercentual > 0 ? ", anúncio" : ""}, imposto e {res.margemPercentual}% de lucro. Baixe a margem
            {r.anuncioPercentual > 0 ? " ou suba a meta de ROAS" : ""}.
          </span>
        )}
      </div>
    );
  } else {
    const venda = r.venda;
    const lucro = venda.lucroCentavos;
    const taxasPedido = r.taxas.filter((t) => !t.foraDoPedido);
    const taxasFora = r.taxas.filter((t) => t.foraDoPedido);
    const pecasDia = res.producao?.pecasPorDia ?? 0;
    // Lucro num preço qualquer com as mesmas taxas, anúncio, imposto e custos do pedido deste canal.
    const lucroEm = (precoCentavos: number) =>
      detalharVenda({
        precoCentavos,
        faixas: r.canal.faixas,
        custoCentavos: r.custoPedidoCentavos,
        anuncioPercentual: r.anuncioPercentual,
        impostoPercentual: res.impostoPercentual,
      }).lucroCentavos;
    // Com margem de folga, o piso dos descontos é o "quero ganhar"; sem folga, o piso global.
    const comFolga = aba !== "direta" && res.margemDescontosPercentual !== null && res.margemPercentual !== null;
    const verba = calcularVerbaDesconto({
      precoCentavos: r.precoCentavos,
      pisoPercentual: comFolga ? res.margemPercentual! : pisoPercentual,
      cupomLoja: aba === "shopee" ? cupomLoja : null,
      lucroEm,
    });
    const maximo = descontoMaximoNoPiso(verba, lucroEm);
    const comDesconto = maximo !== null && maximo.precoFinalCentavos < r.precoCentavos;
    // Depósito do canal num preço: o repasse do preço cheio ajustado pela taxa da plataforma no outro preço.
    const taxaEm = (precoCentavos: number) =>
      detalharVenda({ precoCentavos, faixas: r.canal.faixas, custoCentavos: 0, anuncioPercentual: 0 }).taxaCentavos;
    const recebidoEm = (precoCentavos: number) =>
      r.repasseCentavos === null || r.precoCentavos === null
        ? null
        : r.repasseCentavos - (r.precoCentavos - precoCentavos) + (taxaEm(r.precoCentavos) - taxaEm(precoCentavos));
    const rotuloRecebido = aba === "direta" ? "Recebe" : `Recebe da ${NOME_CANAL[aba]}`;
    const apoioDia = res.producao
      ? res.producao.mesasPorDia > 0
        ? `${res.producao.mesasPorDia} mesas/dia`
        : `${res.producao.mesasPorMes} mesas/mês`
      : "";
    corpo = (
      <>
        <div className={calc.precoConsumidor}>
          <span>Preço para o consumidor</span>
          <strong className={lucro < 0 ? calc.precoPrejuizo : undefined}>{reais(r.precoCentavos)}</strong>
          {r.precoCheioCentavos !== null && (
            <small>
              Anuncie por <b>{reais(r.precoCheioCentavos)}</b> com o desconto da promoção.
            </small>
          )}
          {res.modo === "alvo" && res.margemPercentual !== null && r.precoMargemCentavos !== null && (
            <small>
              Para ganhar {res.margemPercentual}%, venda por <b>{reais(r.precoMargemCentavos)}</b>.
            </small>
          )}
          {r.anuncioPercentual > 0 && r.precoSemAnuncioCentavos !== null && res.modo === "margem" && (
            <small>Sem anúncio seria {reais(r.precoSemAnuncioCentavos)}.</small>
          )}
        </div>

        <div className={calc.estatisticas}>
          <Estatistica rotulo="Custo por unidade" valor={reais(res.custo.totalCentavos)} />
          <Estatistica
            rotulo="Margem de contribuição"
            valor={reais(lucro)}
            apoio={<em className={calc.chipMargem}>{porcentagem(venda.margemPrecoPercentual)}</em>}
            destaque={lucro >= 0 ? "bom" : "ruim"}
          />
          <Estatistica rotulo="Markup" valor={r.markup !== null ? `${r.markup.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×` : "—"} />
        </div>

        <div className={calc.cardTaxas}>
          <div>
            <span>Taxas descontadas no pedido</span>
            <small>{NOME_CANAL[aba]}</small>
          </div>
          <strong>{reais(taxasPedido.reduce((t, l) => t + l.centavos, 0))}</strong>
          <ul>
            {taxasPedido.map((t) => (
              <li key={t.rotulo}>
                <span>{t.rotulo}</span>
                <span>{reais(t.centavos)}</span>
              </li>
            ))}
            {r.repasseCentavos !== null && (
              <li className={calc.repasse}>
                <span>
                  Você recebe {aba === "direta" ? "na venda" : `da ${NOME_CANAL[aba]}`}
                  {aba !== "direta" && <small>É a &quot;renda estimada do pedido&quot; no painel do canal.</small>}
                </span>
                <strong>{reais(r.repasseCentavos)}</strong>
              </li>
            )}
          </ul>
          {taxasFora.length > 0 && (
            <ul className={calc.foraDoPedido}>
              <li className={calc.foraTitulo}>
                <span>Fora do pedido (entra no lucro, não no repasse)</span>
              </li>
              {taxasFora.map((t) => (
                <li key={t.rotulo}>
                  <span>
                    {t.rotulo}
                    {t.rotulo.startsWith("Anúncio") && <small>Sai do saldo de Ads que você recarrega, não da venda.</small>}
                  </span>
                  <span>{reais(t.centavos)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={calc.cardVerba}>
          <VerbaDesconto key={aba} verba={verba} lucroEm={lucroEm} idCampo={`simularDesconto-calc-${aba}`} />
        </div>

        <Composicao custo={res.custo} />

        {(pecasDia > 0 || res.pecasMes > 0) && (
          <div className={calc.potencial}>
            <span className={calc.rotuloGrupo}>Potencial de lucro</span>
            {comDesconto && (
              <FaixaPotencial
                titulo={`Mínimo: tudo com desconto máximo (cliente paga ${reais(maximo!.precoFinalCentavos)})`}
                lucroPeca={maximo!.lucroCentavos}
                recebidoPeca={recebidoEm(maximo!.precoFinalCentavos)}
                rotuloRecebido={rotuloRecebido}
                pecasDia={pecasDia}
                pecasMes={res.pecasMes}
                verbaCentavos={verbaCanal}
                apoioDia={apoioDia}
              />
            )}
            <FaixaPotencial
              titulo={comDesconto ? `Máximo: tudo a preço cheio (${reais(r.precoCentavos)})` : `Tudo a ${reais(r.precoCentavos)}`}
              lucroPeca={lucro}
              recebidoPeca={r.repasseCentavos}
              rotuloRecebido={rotuloRecebido}
              pecasDia={pecasDia}
              pecasMes={res.pecasMes}
              verbaCentavos={verbaCanal}
              apoioDia={apoioDia}
            />
            {comDesconto && (
              <small>O ganho real fica entre os dois, conforme quantas vendas saem com desconto.</small>
            )}
            <small>Lucro = o que sobra depois de repor filamento, energia, máquina, embalagem, extras, anúncio e imposto.</small>
          </div>
        )}

        {aba !== "direta" && (
          <AnuncioCanal
            ehMl={ehMl}
            r={r}
            res={res}
            anuncio={anuncio}
            verbaCentavos={verbaCentavos}
            diasMes={diasMes}
            onEscolherRoas={onEscolherRoas}
            onUsarVerba={onUsarVerba}
          />
        )}
        {aba !== "direta" && (
          <ConcorrenteCanal ehMl={ehMl} r={r} res={res} anuncio={anuncio} precoConcorrenteCentavos={concorrenteCentavos} precoOfertaCentavos={ofertaCentavos} />
        )}
        <KitsCanal r={r} res={res} anuncio={anuncio} verbaCentavos={verbaCentavos} />
        {aba === "shopee" && r.precoCentavos < 1200 && r.canal.faixas.length > 1 && (
          <span className={styles.fieldWarning}>
            Abaixo de R$ 12 a Shopee cobra uma taxa por item menor (regressiva). A conta usa a padrão, então o lucro real fica um
            pouco maior.
          </span>
        )}
      </>
    );
  }

  return (
    <aside className={calc.resumo} aria-live="polite">
      <div className={calc.resumoTopo}>
        <h2>Resumo</h2>
        <span className={pronto ? calc.statusPronto : calc.statusPendente}>{pronto ? "Pronto" : "Faltam dados"}</span>
      </div>

      <div className={calc.abas} role="tablist" aria-label="Resultado por canal">
        {CANAIS_VENDA.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={aba === c} className={aba === c ? calc.abaAtiva : calc.aba} onClick={() => setAba(c)}>
            {NOME_CANAL[c]}
          </button>
        ))}
      </div>

      {res.custo && <CustoPeca custo={res.custo} custoCadastroCentavos={custoCadastroCentavos} />}

      {res.custo && (
        <table className={calc.comparaCanais}>
          <caption>Os três canais neste cálculo</caption>
          <thead>
            <tr>
              <th scope="col">Canal</th>
              <th scope="col">Preço</th>
              <th scope="col">Lucro</th>
            </tr>
          </thead>
          <tbody>
            {CANAIS_VENDA.map((c) => {
              const rc = res.canais[c];
              return (
                <tr key={c} className={c === aba ? calc.comparaAtual : undefined} onClick={() => setAba(c)}>
                  <th scope="row">{NOME_CANAL[c]}</th>
                  <td>{rc?.precoCentavos != null ? reais(rc.precoCentavos) : "—"}</td>
                  <td className={rc?.venda && rc.venda.lucroCentavos < 0 ? calc.perdemos : undefined}>
                    {rc?.venda ? `${reais(rc.venda.lucroCentavos)} (${Math.round(rc.venda.margemPrecoPercentual)}%)` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {corpo}
      {rodape}
    </aside>
  );
}
