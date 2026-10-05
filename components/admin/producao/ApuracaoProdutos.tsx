"use client";

import { useState } from "react";
import styles from "./producao.module.css";

export interface ParteApurada {
  parte: string;
  unidadesProduzidas: number;
  gramasPorUnidade?: number;
  horasPorUnidade?: number;
  custoParteCentavos?: number;
  excedente: number;
  saldoLancavel: number;
}

export interface ProdutoApurado {
  produtoId: string;
  produtoNome: string;
  unidadesAcabadas: number;
  gramasPorPeca?: number;
  horasPorPeca?: number;
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
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
          <Produto key={produto.produtoId} produto={produto} onAlterado={onAlterado} />
        ))
      )}
    </section>
  );
}

function Produto({
  produto,
  onAlterado,
}: {
  produto: ProdutoApurado;
  onAlterado: () => void;
}) {
  const [conjuntos, setConjuntos] = useState(String(produto.conjuntosLancaveis));
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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
        body: JSON.stringify({ produtoId: produto.produtoId, quantidade: Number(conjuntos) }),
      });
      const dados = await resposta.json();

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

  const multiparte = produto.partes.length > 1;

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
          <span className={`${styles.selo} ${styles.seloAmostra}`}>
            sem custo no cadastro
          </span>
        )}
      </div>

      {produto.custoApuradoCentavos !== undefined ? (
        <div className={styles.regua}>
          <div>
            <span className={styles.valorApuradoRotulo}>Apurado por peça</span>
            <strong className={styles.valorApurado}>
              {reais(produto.custoApuradoCentavos)}
            </strong>
          </div>
          <div>
            <span className={styles.valorCadastradoRotulo}>No cadastro</span>
            <span className={styles.valorCadastrado}>
              {reais(produto.custoCadastradoCentavos)}
            </span>
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
            {produto.horasPorPeca !== undefined
              ? `${produto.horasPorPeca.toFixed(2)} h/peça`
              : "—"}
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
              <span>{reais(parte.custoParteCentavos)}</span>
              {parte.excedente > 0 && (
                <span>{parte.excedente} un. adiantadas (sem par)</span>
              )}
            </li>
          ))}
        </ul>
      )}

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
            <span className={styles.pendenteDados}>
              {produto.conjuntosLancaveis} disponíveis
            </span>
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

      {aviso && <p className={styles.ok}>{aviso}</p>}
      {erro && <p className={styles.erro}>{erro}</p>}
    </article>
  );
}
