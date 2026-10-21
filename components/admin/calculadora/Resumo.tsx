"use client";

import type { ReactNode } from "react";
import styles from "../admin.module.css";
import calc from "../calculadoraRapida.module.css";
import type { AnuncioCalculadoraValores } from "@/lib/models/calculoPreco";
import { NOME_CANAL, type CanalVenda } from "@/lib/produtos/canaisCalculadora";
import type { CustoUnidade } from "@/lib/produtos/custoCalculadora";
import { CANAIS_VENDA, type ResultadoCalculadora } from "@/lib/produtos/resultadoCalculadora";
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
    const pecasDia = res.producao?.pecasPorDia ?? 0;
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
            <span>Total de taxas do canal</span>
            <small>{NOME_CANAL[aba]}</small>
          </div>
          <strong>{reais(r.totalTaxasCentavos)}</strong>
          <ul>
            {r.taxas.map((t) => (
              <li key={t.rotulo}>
                <span>{t.rotulo}</span>
                <span>{reais(t.centavos)}</span>
              </li>
            ))}
          </ul>
        </div>

        <Composicao custo={res.custo} />

        {(pecasDia > 0 || res.pecasMes > 0) && (
          <div className={calc.potencial}>
            <span className={calc.rotuloGrupo}>Potencial de lucro</span>
            <div>
              {pecasDia > 0 && (
                <div>
                  <span>Por dia</span>
                  <strong>{reais(lucro * pecasDia)}</strong>
                  <small>
                    {pecasDia} peças · {res.producao!.mesasPorDia} mesas/dia
                  </small>
                </div>
              )}
              {res.pecasMes > 0 && (
                <div>
                  <span>Por mês{verbaCanal > 0 ? " (− verba)" : ""}</span>
                  <strong className={lucro * res.pecasMes - verbaCanal < 0 ? calc.precoPrejuizo : undefined}>{reais(lucro * res.pecasMes - verbaCanal)}</strong>
                  <small>
                    {res.pecasMes} peças · bruto {reais(r.precoCentavos * res.pecasMes)}
                  </small>
                </div>
              )}
            </div>
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
