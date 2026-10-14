"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import calc from "./calculadoraRapida.module.css";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import type { CalculadoraValores } from "@/lib/models/calculoPreco";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import {
  VAZIO_CUSTO_PRODUCAO,
  montarCustoProducao,
  type CustoProducaoFormValores,
} from "@/lib/produtos/custoProducaoFormulario";
import { calcularPrecoSugeridoCanal } from "@/lib/produtos/canais";
import {
  calcularCanalCalculadora,
  calcularProducaoMensal,
  type ResultadoCanalCalculadora,
} from "@/lib/produtos/calculadoraRapida";

type Marketplace = "shopee" | "mercadoLivre";

const NOME_MARKETPLACE: Record<Marketplace, string> = {
  shopee: "Shopee",
  mercadoLivre: "Mercado Livre",
};

type CanalForm = CalculadoraValores["canais"]["shopee"];

function numero(texto: string): number {
  return Number(texto.trim().replace(",", "."));
}

function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Campo numérico curto: rótulo, valor e unidade ao lado. */
function Campo({
  id,
  rotulo,
  unidade,
  valor,
  onChange,
  dica,
}: {
  id: string;
  rotulo: string;
  unidade?: string;
  valor: string;
  onChange: (valor: string) => void;
  dica?: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{rotulo}</label>
      <div className={calc.campoUnidade}>
        <input id={id} inputMode="decimal" value={valor} onChange={(e) => onChange(e.target.value)} />
        {unidade && <span>{unidade}</span>}
      </div>
      {dica && <span className={styles.mlLinkAviso}>{dica}</span>}
    </div>
  );
}

/** Cálculo salvo reaberto na calculadora — ausente = cálculo novo. */
export interface CalculoInicial {
  id: string;
  nome: string;
  linkModelo3d?: string;
  valores: CalculadoraValores;
  produtoId?: string;
}

function valoresPadrao(taxasGlobais: TaxasCanaisConfig): CalculadoraValores {
  return {
    // Filamento é digitado por kg: o carretel de referência fica fixo em 1000 g.
    custo: { ...VAZIO_CUSTO_PRODUCAO, pesoCarreteGramas: "1000", margemPerdaPercentual: "0" },
    margemPercentual: String(taxasGlobais.margemDesejadaPercentual),
    canais: {
      shopee: { taxaPercentual: String(taxasGlobais.shopeeTaxaPercentual), taxaFixaReais: "0", anuncioPercentual: "0" },
      mercadoLivre: { taxaPercentual: "14", taxaFixaReais: "0", anuncioPercentual: "0" },
    },
    producao: { pecasPorMesa: "", horasMesaCheia: "", horasPorDia: "20", diasPorMes: "30" },
    pecasPorMes: "",
  };
}

function producaoDe(producao: CalculadoraValores["producao"]) {
  return calcularProducaoMensal({
    pecasPorMesa: numero(producao.pecasPorMesa),
    horasMesaCheia: numero(producao.horasMesaCheia),
    horasPorDia: numero(producao.horasPorDia),
    diasPorMes: numero(producao.diasPorMes),
  });
}

async function mensagemDeErro(resposta: Response): Promise<string> {
  const dados = await resposta.json().catch(() => ({}));
  const campos = dados.campos ? ` ${Object.values(dados.campos).join(" ")}` : "";
  return `${dados.erro ?? `Erro ${resposta.status} ao salvar.`}${campos}`;
}

export default function CalculadoraRapida({
  taxasGlobais,
  calculoInicial,
}: {
  taxasGlobais: TaxasCanaisConfig;
  calculoInicial?: CalculoInicial;
}) {
  const router = useRouter();
  const inicial = calculoInicial?.valores ?? valoresPadrao(taxasGlobais);
  const [custo, setCusto] = useState<CustoProducaoFormValores>(inicial.custo);
  const [margem, setMargem] = useState(inicial.margemPercentual);
  const [canais, setCanais] = useState<Record<Marketplace, CanalForm>>(inicial.canais);
  const [producao, setProducao] = useState(inicial.producao);
  const [nome, setNome] = useState(calculoInicial?.nome ?? "");
  const [linkModelo, setLinkModelo] = useState(calculoInicial?.linkModelo3d ?? "");
  const [calculoId, setCalculoId] = useState(calculoInicial?.id ?? null);
  const [produtoId, setProdutoId] = useState(calculoInicial?.produtoId ?? null);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const alterarCusto = (chave: keyof CustoProducaoFormValores) => (valor: string) =>
    setCusto((atual) => ({ ...atual, [chave]: valor }));
  const alterarCanal = (canal: Marketplace, chave: keyof CanalForm) => (valor: string) =>
    setCanais((atual) => ({ ...atual, [canal]: { ...atual[canal], [chave]: valor } }));
  const alterarProducao = (chave: keyof typeof producao) => (valor: string) =>
    setProducao((atual) => ({ ...atual, [chave]: valor }));

  const custoProducao = montarCustoProducao(custo);
  const cogs = custoProducao ? calcularCustoProducao(custoProducao) : null;
  const margemNumero = numero(margem);
  const margemValida = margem.trim() !== "" && Number.isFinite(margemNumero) && margemNumero >= 0;

  const producaoMensal = producaoDe(producao);
  const pecasAuto = producaoMensal?.pecasPorMes ?? null;

  // "Peças no mês" segue o cálculo automático sempre que ele muda, mas pode ser digitado por cima.
  // Ao reabrir um cálculo salvo, mantém o valor que estava gravado.
  const [pecasMes, setPecasMes] = useState(
    calculoInicial ? inicial.pecasPorMes : pecasAuto !== null ? String(pecasAuto) : ""
  );
  const [pecasAutoAnterior, setPecasAutoAnterior] = useState<number | null>(pecasAuto);
  if (pecasAuto !== pecasAutoAnterior) {
    setPecasAutoAnterior(pecasAuto);
    setPecasMes(pecasAuto !== null ? String(pecasAuto) : "");
  }
  const pecasMesNumero = Math.max(0, Math.floor(numero(pecasMes) || 0));

  function resultadoCanal(canal: Marketplace): ResultadoCanalCalculadora | null {
    if (!cogs || !margemValida) return null;
    const c = canais[canal];
    const taxa = numero(c.taxaPercentual);
    const fixa = c.taxaFixaReais.trim() === "" ? 0 : numero(c.taxaFixaReais);
    const anuncio = c.anuncioPercentual.trim() === "" ? 0 : numero(c.anuncioPercentual);
    if (![taxa, fixa, anuncio].every((n) => Number.isFinite(n) && n >= 0)) return null;
    return calcularCanalCalculadora({
      custoCentavos: cogs.totalCentavos,
      margemDesejadaPercentual: margemNumero,
      taxa: { percentual: taxa, fixaCentavos: Math.round(fixa * 100) },
      anuncioPercentual: anuncio,
      pecasPorMes: pecasMesNumero,
    });
  }

  const resultados: Record<Marketplace, ResultadoCanalCalculadora | null> = {
    shopee: resultadoCanal("shopee"),
    mercadoLivre: resultadoCanal("mercadoLivre"),
  };

  // Preço do site no produto: mesma fórmula do cadastro, com a taxa do site próprio.
  const precoSiteCentavos =
    cogs && margemValida
      ? calcularPrecoSugeridoCanal(cogs.totalCentavos, margemNumero, {
          percentual: taxasGlobais.siteTaxaPercentual,
          fixaCentavos: taxasGlobais.siteTaxaFixaCentavos,
        })
      : null;

  const podeSalvarCalculo = nome.trim() !== "" && !salvando;
  const podeCriarProduto = podeSalvarCalculo && custoProducao !== null && precoSiteCentavos !== null && !produtoId;

  /** Grava (cria ou atualiza) o cálculo — `false` se a API recusar (o erro já fica na tela). */
  async function gravarCalculo(produtoCriadoId?: string): Promise<boolean> {
    const resposta = await fetch(calculoId ? `/api/admin/calculos-preco/${calculoId}` : "/api/admin/calculos-preco", {
      method: calculoId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nome.trim(),
        linkModelo3d: linkModelo.trim(),
        produtoId: produtoCriadoId ?? produtoId ?? undefined,
        valores: { custo, margemPercentual: margem, canais, producao, pecasPorMes: pecasMes },
      }),
    });
    if (!resposta.ok) {
      setErroSalvar(await mensagemDeErro(resposta));
      return false;
    }
    const { calculo } = await resposta.json();
    if (!calculoId) {
      const id = String(calculo._id);
      setCalculoId(id);
      router.replace(`/admin/produtos/calculadora?id=${id}`, { scroll: false });
    }
    router.refresh();
    return true;
  }

  async function salvarCalculo() {
    if (!podeSalvarCalculo) return;
    setSalvando(true);
    setErroSalvar(null);
    setAviso(null);
    try {
      if (await gravarCalculo()) setAviso("Cálculo salvo.");
    } catch (erro) {
      setErroSalvar(`Não foi possível salvar: ${erro instanceof Error ? erro.message : String(erro)}`);
    } finally {
      setSalvando(false);
    }
  }

  async function criarProduto() {
    if (!podeCriarProduto || !custoProducao || precoSiteCentavos === null) return;
    setSalvando(true);
    setErroSalvar(null);
    setAviso(null);
    try {
      const precosCanais: { shopee?: number; mercadoLivre?: number } = {};
      if (resultados.shopee?.precoCentavos) precosCanais.shopee = resultados.shopee.precoCentavos;
      if (resultados.mercadoLivre?.precoCentavos) precosCanais.mercadoLivre = resultados.mercadoLivre.precoCentavos;

      const resposta = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: "Rascunho criado pela calculadora de preço — completar a descrição.",
          preco: precoSiteCentavos,
          estoque: 0,
          fotos: [],
          custoProducao,
          taxasCanais: {
            shopeeTaxaPercentual: numero(canais.shopee.taxaPercentual),
            margemDesejadaPercentual: margemNumero,
          },
          precosCanais,
          linkModelo3d: linkModelo.trim(),
          publicado: false,
        }),
      });
      if (!resposta.ok) {
        setErroSalvar(await mensagemDeErro(resposta));
        return;
      }
      const dados = await resposta.json();
      const novoProdutoId = String(dados.produto._id);
      setProdutoId(novoProdutoId);
      // O cálculo fica guardado com o vínculo ao produto criado.
      await gravarCalculo(novoProdutoId);
    } catch (erro) {
      setErroSalvar(`Não foi possível criar o produto: ${erro instanceof Error ? erro.message : String(erro)}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={calc.grade}>
      <div className={calc.entradas}>
        <section className={calc.bloco}>
          <h2>Custo da peça</h2>
          <div className={calc.campos3}>
            <Campo id="tempo" rotulo="Tempo de impressão" unidade="h" valor={custo.tempoImpressaoHoras} onChange={alterarCusto("tempoImpressaoHoras")} dica="De 1 peça. Ex: 1.5" />
            <Campo id="peso" rotulo="Filamento usado" unidade="g" valor={custo.pesoPecaGramas} onChange={alterarCusto("pesoPecaGramas")} />
            <Campo id="perda" rotulo="Perda" unidade="%" valor={custo.margemPerdaPercentual} onChange={alterarCusto("margemPerdaPercentual")} dica="Purga, suportes, falhas" />
            <Campo id="filamento" rotulo="Preço do filamento" unidade="R$/kg" valor={custo.precoCarreteReais} onChange={alterarCusto("precoCarreteReais")} />
            <Campo id="energia" rotulo="Luz" unidade="R$/kWh" valor={custo.tarifaEnergiaReais} onChange={alterarCusto("tarifaEnergiaReais")} />
            <Campo id="embalagem" rotulo="Embalagem" unidade="R$" valor={custo.custoEmbalagemReais} onChange={alterarCusto("custoEmbalagemReais")} dica="Saquinho, caixa…" />
          </div>
          <details className={calc.ajustes}>
            <summary>Impressora e mão de obra (já preenchidos)</summary>
            <div className={calc.campos3}>
              <Campo id="consumo" rotulo="Consumo da impressora" unidade="kW" valor={custo.consumoEletricoKwh} onChange={alterarCusto("consumoEletricoKwh")} />
              <Campo id="impressora" rotulo="Preço da impressora" unidade="R$" valor={custo.precoImpressoraReais} onChange={alterarCusto("precoImpressoraReais")} />
              <Campo id="vida" rotulo="Vida útil" unidade="h" valor={custo.vidaUtilImpressoraHoras} onChange={alterarCusto("vidaUtilImpressoraHoras")} />
              <Campo id="maoObra" rotulo="Mão de obra por peça" unidade="h" valor={custo.tempoMaoDeObraHoras} onChange={alterarCusto("tempoMaoDeObraHoras")} />
              <Campo id="valorHora" rotulo="Valor da hora" unidade="R$" valor={custo.valorHoraTrabalhoReais} onChange={alterarCusto("valorHoraTrabalhoReais")} />
            </div>
          </details>
          <p className={calc.custoTotal}>
            {cogs ? (
              <>
                Custo por peça: <strong>{reais(cogs.totalCentavos)}</strong>
                <span className={styles.mlLinkAviso}>
                  {" "}
                  filamento {reais(cogs.custoFilamentoCentavos)} · luz {reais(cogs.custoEnergiaCentavos)} · embalagem{" "}
                  {reais(cogs.custoEmbalagemCentavos)} · impressora {reais(cogs.custoDepreciacaoCentavos)} · mão de obra{" "}
                  {reais(cogs.custoMaoDeObraCentavos)}
                </span>
              </>
            ) : (
              <span className={styles.mlLinkAviso}>Preencha tempo e filamento usado para ver o custo.</span>
            )}
          </p>
        </section>

        <section className={calc.bloco}>
          <h2>Margem e anúncio</h2>
          <Campo id="margem" rotulo="Quanto quero ganhar" unidade="% sobre o custo" valor={margem} onChange={setMargem} dica="100% = lucro igual ao custo da peça" />
          {(Object.keys(NOME_MARKETPLACE) as Marketplace[]).map((canal) => (
            <div key={canal} className={calc.linhaCanal}>
              <strong>{NOME_MARKETPLACE[canal]}</strong>
              <Campo id={`taxa-${canal}`} rotulo="Taxa da plataforma" unidade="%" valor={canais[canal].taxaPercentual} onChange={alterarCanal(canal, "taxaPercentual")} />
              <Campo id={`fixa-${canal}`} rotulo="Taxa fixa por venda" unidade="R$" valor={canais[canal].taxaFixaReais} onChange={alterarCanal(canal, "taxaFixaReais")} />
              <Campo id={`ads-${canal}`} rotulo="Anúncio pago" unidade="% da venda" valor={canais[canal].anuncioPercentual} onChange={alterarCanal(canal, "anuncioPercentual")} />
            </div>
          ))}
          <span className={styles.mlLinkAviso}>
            Anúncio pago = quanto de cada venda vai para a Shopee/Mercado Livre mostrar mais o produto. Ele entra no
            preço, então sua margem continua garantida.
          </span>
        </section>

        <section className={calc.bloco}>
          <h2>Produção no mês</h2>
          <div className={calc.campos3}>
            <Campo id="pecasMesa" rotulo="Peças por mesa" unidade="un" valor={producao.pecasPorMesa} onChange={alterarProducao("pecasPorMesa")} dica="Quantas cabem na mesa cheia" />
            <Campo id="horasMesa" rotulo="Tempo da mesa cheia" unidade="h" valor={producao.horasMesaCheia} onChange={alterarProducao("horasMesaCheia")} />
            <Campo id="horasDia" rotulo="Horas de impressão por dia" unidade="h" valor={producao.horasPorDia} onChange={alterarProducao("horasPorDia")} />
            <Campo id="diasMes" rotulo="Dias no mês" unidade="dias" valor={producao.diasPorMes} onChange={alterarProducao("diasPorMes")} />
            <Campo
              id="pecasMes"
              rotulo="Peças no mês"
              unidade="un"
              valor={pecasMes}
              onChange={setPecasMes}
              dica={
                producaoMensal
                  ? `Automático: ${producaoMensal.mesasPorDia} mesas/dia = ${producaoMensal.pecasPorDia} peças/dia. Pode alterar.`
                  : "Calculado pela mesa, ou digite."
              }
            />
          </div>
        </section>
      </div>

      <aside className={calc.resultado} aria-live="polite">
        {(Object.keys(NOME_MARKETPLACE) as Marketplace[]).map((canal) => {
          const r = resultados[canal];
          return (
            <div key={canal} className={calc.cartaoCanal}>
              <span className={calc.nomeCanal}>{NOME_MARKETPLACE[canal]}</span>
              {!r ? (
                <span className={styles.mlLinkAviso}>Preencha o custo e a margem.</span>
              ) : r.precoCentavos === null ? (
                <span className={styles.fieldError}>Taxa + anúncio precisam somar menos de 100%.</span>
              ) : (
                <>
                  <span className={calc.preco}>{reais(r.precoCentavos)}</span>
                  <span className={calc.precoLegenda}>venda por esse preço</span>
                  <dl className={calc.conta}>
                    <dt>Taxa da plataforma</dt>
                    <dd>− {reais(r.taxaCentavos)}</dd>
                    <dt>Anúncio pago</dt>
                    <dd>− {reais(r.anuncioCentavos)}</dd>
                    <dt>Custo da peça</dt>
                    <dd>− {reais(cogs!.totalCentavos)}</dd>
                    <dt className={calc.lucro}>Seu lucro por peça</dt>
                    <dd className={calc.lucro}>{reais(r.lucroCentavos)}</dd>
                  </dl>
                  <div className={calc.mes}>
                    <span>{pecasMesNumero} peças no mês</span>
                    <span>
                      Faturamento bruto <strong>{reais(r.brutoMesCentavos)}</strong>
                    </span>
                    <span>
                      Lucro líquido <strong>{reais(r.lucroMesCentavos)}</strong>
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}

        <div className={calc.salvar}>
          <div className={styles.field}>
            <label htmlFor="nomeRascunho">Nome do produto</label>
            <input id="nomeRascunho" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Vaso geométrico" />
          </div>
          <div className={styles.field}>
            <label htmlFor="linkModelo">Link do modelo (MakerWorld)</label>
            <input
              id="linkModelo"
              type="url"
              value={linkModelo}
              onChange={(e) => setLinkModelo(e.target.value)}
              placeholder="https://makerworld.com/..."
            />
          </div>
          <button type="button" className={styles.btnPrimary} disabled={!podeSalvarCalculo} onClick={salvarCalculo}>
            {salvando ? "Salvando…" : calculoId ? "Salvar alterações" : "Salvar cálculo"}
          </button>
          <span className={styles.mlLinkAviso}>
            Fica em &quot;Cálculos salvos&quot; para você voltar e ajustar. Ainda não vira produto.
          </span>
          {aviso && <span className={styles.formSuccess}>{aviso}</span>}
          {erroSalvar && <span className={styles.fieldError}>{erroSalvar}</span>}

          {produtoId ? (
            <span className={styles.formSuccess}>
              Já virou produto: <Link href={`/admin/produtos/${produtoId}/editar`}>abrir o rascunho do produto</Link>
            </span>
          ) : (
            <>
              <button type="button" className={styles.btnGhost} disabled={!podeCriarProduto} onClick={criarProduto}>
                Transformar em produto rascunho
              </button>
              {precoSiteCentavos !== null && (
                <span className={styles.mlLinkAviso}>
                  Quando estiver pronto: cria o produto (fora da loja) com custo, margem e preços da Shopee e do
                  Mercado Livre. Preço no site: {reais(precoSiteCentavos)}.
                </span>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
