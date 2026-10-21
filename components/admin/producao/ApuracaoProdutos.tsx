"use client";

import { useEffect, useRef, useState } from "react";
import { HORARIO_TERMINO_PADRAO } from "@/lib/models/producao";
import { horasEMinutos, inicioMaximo } from "@/lib/producao/agenda";
import styles from "./producao.module.css";

export interface ImpressaoDaParte {
  id: string;
  nomeArquivo: string;
  horarioTermino?: string;
  inicio: string;
  resultado: "concluida" | "interrompida" | "em_andamento";
  gramas?: number;
  duracaoSegundos?: number;
  rendimentoPorPlaca: number;
  foraDoCusto: boolean;
}

export interface ParteApurada {
  parte: string;
  unidadesProduzidas: number;
  gramasPorUnidade?: number;
  horasPorUnidade?: number;
  horasPorPlaca?: number;
  custoParteCentavos?: number;
  excedente: number;
  saldoLancavel: number;
  impressoes: ImpressaoDaParte[];
  arquivos: string[];
}

export interface ProdutoApurado {
  produtoId: string;
  produtoNome: string;
  unidadesAcabadas: number;
  gramasPorPeca?: number;
  horasPorPeca?: number;
  horasRodadaCompleta?: number;
  horasTotaisImpressas: number;
  custoApuradoCentavos?: number;
  custoCadastradoCentavos?: number;
  diferencaCentavos?: number;
  parcial: boolean;
  partesSemDados: string[];
  semCustoCadastrado: boolean;
  taxaFalhaObservada?: number;
  amostra: number;
  amostraPequena: boolean;
  perdaObservadaPercentual?: number;
  gramasPerdidosEmFalhas: number;
  valorPerdidoEmFalhasCentavos?: number;
  conjuntosLancaveis: number;
  partes: ParteApurada[];
}

export interface ResumoProducao {
  gramasPerdidosEmFalhas: number;
  valorPerdidoEmFalhasCentavos: number;
  impressoesSemVinculo: number;
}

function reais(centavos?: number): string {
  if (centavos === undefined) return "—";
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function comSinal(centavos: number): string {
  const valor = reais(Math.abs(centavos));
  return `${centavos > 0 ? "+" : centavos < 0 ? "−" : ""}${valor}`;
}

/**
 * Apuração por produto (US3/US5).
 *
 * O par apurado × cadastrado é o centro da tela: o apurado em peso alto, o
 * cadastrado abaixo como referência, e o chip de diferença colorido por
 * direção — turquesa quando o custo real é menor do que o cadastrado, rosa
 * quando o cadastro está subestimando.
 *
 * Nada aqui altera cadastro sozinho: "Aplicar ao cadastro" é explícito
 * (FR-027/FR-028).
 */
export default function ApuracaoProdutos({
  produtos,
  resumo,
  onAlterado,
}: {
  produtos: ProdutoApurado[];
  resumo: ResumoProducao;
  onAlterado: () => void;
}) {
  return (
    <section className={styles.bloco}>
      <h2 className={styles.tituloBloco}>Custo por produto</h2>
      <p className={styles.subtituloBloco}>
        Apurado nas impressões reais, ao lado do custo que está no cadastro. No mês:{" "}
        {Math.round(resumo.gramasPerdidosEmFalhas)} g perdidos em falhas (
        {reais(resumo.valorPerdidoEmFalhasCentavos)})
        {resumo.impressoesSemVinculo > 0 &&
          ` · ${resumo.impressoesSemVinculo} impressões ainda sem produto`}
        .
      </p>

      {produtos.length === 0 ? (
        <p className={styles.vazio}>
          Nenhum produto com produção mapeada ainda. Mapeie um arquivo acima para ver o custo
          apurado aqui.
        </p>
      ) : (
        produtos.map((produto) => (
          <ProdutoApuradoCard key={produto.produtoId} produto={produto} onAlterado={onAlterado} />
        ))
      )}
    </section>
  );
}

/**
 * O card de um produto. `comAcoes={false}` na edição do produto: lá o
 * formulário tem o próprio estado de estoque e custo, e lançar ou aplicar por
 * aqui seria desfeito no próximo "Salvar" do formulário.
 */
export function ProdutoApuradoCard({
  produto,
  onAlterado,
  comAcoes = true,
}: {
  produto: ProdutoApurado;
  onAlterado: () => void;
  comAcoes?: boolean;
}) {
  const [conjuntos, setConjuntos] = useState(String(produto.conjuntosLancaveis));
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [escolhendo, setEscolhendo] = useState(!comAcoes); // na edição do produto já abre listado
  /** Horário digitado e ainda não salvo, por placa. */
  const [terminos, setTerminos] = useState<Record<string, string>>({});
  /**
   * Marcação "fora do custo" já clicada e ainda não refletida no recarregamento.
   * A caixa muda na hora, as outras continuam clicáveis e o recarregamento só
   * acontece quando a última gravação termina — recarregar a cada clique fazia
   * a lista piscar e uma resposta antiga desfazer o clique seguinte.
   */
  const [foraLocal, setForaLocal] = useState<Record<string, boolean>>({});
  const gravando = useRef(new Set<string>());

  useEffect(() => {
    // Dados novos chegaram: só mantém o que ainda está sendo gravado.
    setForaLocal((atual) =>
      Object.fromEntries(Object.entries(atual).filter(([id]) => gravando.current.has(id)))
    );
  }, [produto]);

  const foraDoCusto = (impressao: ImpressaoDaParte) =>
    foraLocal[impressao.id] ?? impressao.foraDoCusto;

  async function aplicarAoCadastro() {
    setEnviando(true);
    setErro(null);
    setAviso(null);

    const custoProducao: Record<string, number> = {};
    if (produto.gramasPorPeca !== undefined) {
      custoProducao.pesoPecaGramas = Number(produto.gramasPorPeca.toFixed(2));
    }
    if (produto.horasPorPeca !== undefined) {
      custoProducao.tempoImpressaoHoras = Number(produto.horasPorPeca.toFixed(2));
    }
    if (produto.taxaFalhaObservada !== undefined && !produto.amostraPequena) {
      custoProducao.taxaFalhaPercentual = Number((produto.taxaFalhaObservada * 100).toFixed(1));
    }

    try {
      const resposta = await fetch(`/api/produtos/${produto.produtoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custoProducao }),
      });

      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        setErro(dados.erro ?? `Falha ao aplicar (HTTP ${resposta.status}).`);
        return;
      }

      setAviso("Custo do cadastro atualizado com os valores apurados.");
      onAlterado();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao aplicar.");
    } finally {
      setEnviando(false);
    }
  }

  async function lancarConjuntos() {
    setEnviando(true);
    setErro(null);
    setAviso(null);

    try {
      const resposta = await fetch("/api/producao/lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId: produto.produtoId,
          quantidade: Number(conjuntos),
        }),
      });
      const dados = await resposta.json().catch(() => ({}) as Record<string, string>);

      if (!resposta.ok) {
        setErro(dados.erro ?? `Falha ao lançar (HTTP ${resposta.status}).`);
        return;
      }

      setAviso(`Estoque atualizado: ${dados.estoqueAtual} unidades.`);
      onAlterado();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao lançar.");
    } finally {
      setEnviando(false);
    }
  }

  async function alternarNoCusto(impressao: ImpressaoDaParte) {
    if (gravando.current.has(impressao.id)) return;
    const novo = !foraDoCusto(impressao);
    gravando.current.add(impressao.id);
    setForaLocal((atual) => ({ ...atual, [impressao.id]: novo }));
    setErro(null);
    setAviso(null);

    try {
      const resposta = await fetch(`/api/producao/impressoes/${impressao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foraDoCusto: novo }),
      });

      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        setErro(dados.erro ?? `Falha ao atualizar a impressão (HTTP ${resposta.status}).`);
        setForaLocal((atual) => ({ ...atual, [impressao.id]: !novo }));
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao atualizar a impressão.");
      setForaLocal((atual) => ({ ...atual, [impressao.id]: !novo }));
    } finally {
      gravando.current.delete(impressao.id);
      if (gravando.current.size === 0) onAlterado();
    }
  }

  /** Tira a parte do produto: remove os vínculos das placas dela (as impressões voltam a "sem produto"). */
  async function removerParte(parte: ParteApurada) {
    if (
      !window.confirm(
        `Remover a parte "${parte.parte}" deste produto? As impressões dela deixam de contar aqui e voltam para a lista de impressões sem produto.`
      )
    ) {
      return;
    }
    setEnviando(true);
    setErro(null);
    setAviso(null);

    try {
      for (const arquivo of parte.arquivos) {
        const resposta = await fetch(`/api/producao/vinculos/${encodeURIComponent(arquivo)}`, {
          method: "DELETE",
        });
        if (!resposta.ok && resposta.status !== 404) {
          const dados = await resposta.json().catch(() => ({}));
          setErro(dados.erro ?? `Falha ao remover a parte (HTTP ${resposta.status}).`);
          return;
        }
      }
      setAviso(`Parte "${parte.parte}" removida do produto.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao remover a parte.");
    } finally {
      setEnviando(false);
      onAlterado();
    }
  }

  async function salvarTermino(nomeArquivo: string) {
    setEnviando(true);
    setErro(null);
    setAviso(null);

    try {
      const resposta = await fetch(`/api/producao/vinculos/${encodeURIComponent(nomeArquivo)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horarioTermino: terminos[nomeArquivo] }),
      });

      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        setErro(dados.erro ?? `Falha ao salvar o horário (HTTP ${resposta.status}).`);
        return;
      }

      setTerminos((atual) => {
        const resto = { ...atual };
        delete resto[nomeArquivo];
        return resto;
      });
      setAviso("Horário de término salvo.");
      onAlterado();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao salvar o horário.");
    } finally {
      setEnviando(false);
    }
  }

  const multiparte = produto.partes.length > 1;
  const impressoes = produto.partes.flatMap((p) => p.impressoes ?? []);
  const noCusto = impressoes.filter((i) => i.resultado !== "em_andamento" && !foraDoCusto(i)).length;
  const finalizadas = impressoes.filter((i) => i.resultado !== "em_andamento").length;

  return (
    <article className={styles.produto}>
      <div className={styles.produtoTopo}>
        <h3 className={styles.produtoNome}>{produto.produtoNome}</h3>
        <span className={styles.unidades}>
          {produto.unidadesAcabadas}{" "}
          {produto.unidadesAcabadas === 1 ? "peça produzida" : "peças produzidas"}
        </span>
        {produto.parcial && (
          <span className={`${styles.selo} ${styles.seloParcial}`}>
            falta produção de {produto.partesSemDados.join(", ")}
          </span>
        )}
        {produto.semCustoCadastrado && (
          <span className={`${styles.selo} ${styles.seloAmostra}`}>sem custo no cadastro</span>
        )}
      </div>

      {produto.custoApuradoCentavos !== undefined ? (
        <div className={styles.regua}>
          <div>
            <span className={styles.valorApuradoRotulo}>Apurado por peça</span>
            <strong className={styles.valorApurado}>{reais(produto.custoApuradoCentavos)}</strong>
          </div>
          <div>
            <span className={styles.valorCadastradoRotulo}>No cadastro</span>
            <span className={styles.valorCadastrado}>{reais(produto.custoCadastradoCentavos)}</span>
          </div>
          {produto.diferencaCentavos !== undefined && (
            <span
              className={`${styles.chipDiferenca} ${
                produto.diferencaCentavos > 0 ? styles.chipAcima : styles.chipAbaixo
              }`}
            >
              {comSinal(produto.diferencaCentavos)}{" "}
              {produto.diferencaCentavos > 0 ? "acima do cadastro" : "abaixo do cadastro"}
            </span>
          )}
        </div>
      ) : (
        <p className={styles.vazio}>
          {produto.parcial
            ? "Custo apurado incompleto: falta produção de alguma parte."
            : "Sem dados de produção suficientes para apurar o custo."}
        </p>
      )}

      <div className={styles.metricas}>
        <span>
          Filamento:{" "}
          <span className={styles.metricaValor}>
            {produto.gramasPorPeca !== undefined
              ? `${produto.gramasPorPeca.toFixed(1)} g/peça`
              : "—"}
          </span>
        </span>
        <span>
          Impressão:{" "}
          <span className={styles.metricaValor}>
            {produto.horasPorPeca !== undefined ? `${produto.horasPorPeca.toFixed(2)} h/peça` : "—"}
          </span>
        </span>
        <span>
          {multiparte ? "Uma placa de cada parte" : "Por placa"}:{" "}
          <span className={styles.metricaValor}>
            {produto.horasRodadaCompleta !== undefined
              ? horasEMinutos(produto.horasRodadaCompleta)
              : "—"}
          </span>
        </span>
        <span>
          Total impresso:{" "}
          <span className={styles.metricaValor}>
            {horasEMinutos(produto.horasTotaisImpressas ?? 0)}
          </span>
        </span>
        <span>
          Falha:{" "}
          <span className={styles.metricaValor}>
            {produto.taxaFalhaObservada !== undefined
              ? `${(produto.taxaFalhaObservada * 100).toFixed(1)}%`
              : "—"}
          </span>
          {produto.amostraPequena && (
            <>
              {" "}
              <span className={`${styles.selo} ${styles.seloAmostra}`}>
                só {produto.amostra} impressões
              </span>
            </>
          )}
        </span>
        <span>
          Perda:{" "}
          <span className={styles.metricaValor}>
            {produto.perdaObservadaPercentual !== undefined
              ? `${produto.perdaObservadaPercentual > 0 ? "+" : ""}${produto.perdaObservadaPercentual.toFixed(1)}%`
              : "—"}
          </span>
        </span>
      </div>

      {multiparte && (
        <ul className={styles.partes}>
          {produto.partes.map((parte) => (
            <li key={parte.parte} className={styles.parte}>
              <span className={styles.parteNome}>{parte.parte}</span>
              <span>{parte.unidadesProduzidas} un. produzidas</span>
              <span>
                {parte.gramasPorUnidade !== undefined
                  ? `${parte.gramasPorUnidade.toFixed(1)} g/un.`
                  : "sem peso"}
              </span>
              <span>
                {parte.horasPorUnidade !== undefined
                  ? `${parte.horasPorUnidade.toFixed(2)} h/un.`
                  : "sem tempo"}
              </span>
              <span>{reais(parte.custoParteCentavos)}</span>
              {parte.excedente > 0 && <span>{parte.excedente} un. adiantadas (sem par)</span>}
              <button
                type="button"
                className={styles.botaoTexto}
                onClick={() => removerParte(parte)}
                disabled={enviando}
                title="A peça saiu em outra placa? Tire esta parte do produto."
              >
                Remover parte
              </button>
            </li>
          ))}
        </ul>
      )}

      {impressoes.length > 0 && (
        <div className={styles.escolhaImpressoes}>
          <button
            type="button"
            className={styles.botaoTexto}
            onClick={() => setEscolhendo((v) => !v)}
            aria-expanded={escolhendo}
          >
            {escolhendo ? "Fechar impressões" : "Impressões e horários"}
          </button>{" "}
          <span className={styles.pendenteDados}>
            {noCusto} de {finalizadas} no cálculo
          </span>
          {escolhendo &&
            produto.partes.map((parte) => (
              <fieldset key={parte.parte} className={styles.grupoImpressoes}>
                {multiparte && <legend className={styles.parteNome}>{parte.parte}</legend>}
                {parte.impressoes.map((impressao) => {
                  const salvo = impressao.horarioTermino ?? HORARIO_TERMINO_PADRAO;
                  const termino = terminos[impressao.nomeArquivo] ?? salvo;
                  const alterado = termino !== salvo;
                  const fora = foraDoCusto(impressao);
                  const planejavel =
                    !fora &&
                    impressao.resultado === "concluida" &&
                    (impressao.duracaoSegundos ?? 0) > 0;
                  const inicio = planejavel
                    ? inicioMaximo(termino, impressao.duracaoSegundos!)
                    : null;

                  return (
                    <div
                      key={impressao.id}
                      className={`${styles.linhaImpressao} ${
                        fora ? styles.linhaForaDoCusto : ""
                      }`}
                    >
                      <label className={styles.marcaImpressao}>
                        <input
                          type="checkbox"
                          checked={!fora}
                          disabled={impressao.resultado === "em_andamento"}
                          onChange={() => alternarNoCusto(impressao)}
                        />
                        <span>{dataHora(impressao.inicio)}</span>
                      </label>
                      <span>
                        {impressao.resultado === "concluida"
                          ? `${impressao.rendimentoPorPlaca} un.`
                          : impressao.resultado === "interrompida"
                            ? "falhou"
                            : "imprimindo"}
                      </span>
                      <span>
                        {impressao.gramas !== undefined
                          ? `${impressao.gramas.toFixed(1)} g`
                          : "sem peso"}
                      </span>
                      <span>
                        {impressao.duracaoSegundos !== undefined
                          ? horasEMinutos(impressao.duracaoSegundos / 3600)
                          : "sem duração"}
                      </span>

                      {planejavel && (
                        <span className={styles.agendaImpressao}>
                          terminar às
                          <input
                            type="time"
                            className={styles.entradaHorario}
                            value={termino}
                            aria-label="Horário de término desta placa"
                            onChange={(e) =>
                              setTerminos((t) => ({
                                ...t,
                                [impressao.nomeArquivo]: e.target.value,
                              }))
                            }
                          />
                          {inicio && (
                            <span>
                              → iniciar até{" "}
                              <strong className={styles.metricaValor}>{inicio.horario}</strong>
                              {inicio.diasAntes === 1 && " da véspera"}
                              {inicio.diasAntes > 1 && ` (${inicio.diasAntes} dias antes)`}
                            </span>
                          )}
                          {alterado && (
                            <button
                              type="button"
                              className={styles.botaoTexto}
                              onClick={() => salvarTermino(impressao.nomeArquivo)}
                              disabled={enviando || !inicio}
                            >
                              Salvar horário
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
              </fieldset>
            ))}
        </div>
      )}

      {comAcoes && (
        <div className={styles.acoesProduto}>
          {produto.conjuntosLancaveis > 0 && (
            <>
              <label className={`${styles.campo} ${styles.campoCurto}`}>
                <span className={styles.rotulo}>
                  {multiparte ? "Conjuntos completos" : "Unidades"}
                </span>
                <input
                  className={styles.entrada}
                  value={conjuntos}
                  onChange={(e) => setConjuntos(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <button
                type="button"
                className={styles.botao}
                onClick={lancarConjuntos}
                disabled={enviando}
              >
                Lançar no estoque
              </button>
              <span className={styles.pendenteDados}>{produto.conjuntosLancaveis} disponíveis</span>
            </>
          )}

          {produto.custoApuradoCentavos !== undefined && (
            <button
              type="button"
              className={`${styles.botao} ${styles.botaoSecundario}`}
              onClick={aplicarAoCadastro}
              disabled={enviando}
            >
              Aplicar ao cadastro
            </button>
          )}
        </div>
      )}

      {aviso && <p className={styles.ok}>{aviso}</p>}
      {erro && <p className={styles.erro}>{erro}</p>}
    </article>
  );
}
