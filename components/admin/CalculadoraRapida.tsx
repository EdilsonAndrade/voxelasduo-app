"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import calc from "./calculadoraRapida.module.css";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import type { AnuncioCalculadoraValores, CalculadoraValores, ModoAnuncio } from "@/lib/models/calculoPreco";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { ANUNCIO_PADRAO, valoresPadrao } from "@/lib/produtos/calculadoraPadrao";
import {
  VAZIO_CUSTO_PRODUCAO,
  montarCustoProducao,
  type CustoProducaoFormValores,
} from "@/lib/produtos/custoProducaoFormulario";
import {
  calcularCustoKit,
  calcularCustoMaximo,
  calcularLimiteAnuncio,
  calcularPrecoPorMargem,
  calcularProducaoMensal,
  calcularRetornoVerba,
  detalharVenda,
  faixaUnica,
  type DetalheVenda,
  type FaixaTaxa,
  type LimiteAnuncio,
} from "@/lib/produtos/calculadoraRapida";
import { faixasDoCanal as faixasDoCanalSalvo, type Marketplace } from "@/lib/produtos/orcamento";


const NOME_MARKETPLACE: Record<Marketplace, string> = {
  shopee: "Shopee",
  mercadoLivre: "Mercado Livre",
};

const MODOS_ANUNCIO: Array<{ modo: ModoAnuncio; rotulo: string; explicacao: string }> = [
  { modo: "sem", rotulo: "Sem anúncio", explicacao: "Preço só com custo, taxa e o seu lucro." },
  {
    modo: "embutido",
    rotulo: "Embutido no preço",
    explicacao: "O preço sobe para pagar o anúncio. Quem paga o anúncio é o comprador.",
  },
  {
    modo: "bolso",
    rotulo: "Do meu bolso",
    explicacao: "O preço fica sem anúncio e você investe uma verba à parte. Mostra se ela volta com lucro.",
  },
];

type CanalForm = CalculadoraValores["canais"]["shopee"];

function numero(texto: string): number {
  return Number(texto.trim().replace(",", "."));
}

function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** ROAS com uma casa, arredondado para cima — a meta nunca fica abaixo do necessário. */
function formatarRoas(roas: number): string {
  return (Math.ceil(roas * 10) / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** ACOS (usado no Mercado Livre) = 100 ÷ ROAS, arredondado para baixo — o teto nunca fica acima do permitido. */
function formatarAcos(roas: number): string {
  return `${(Math.floor((100 / roas) * 10) / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function descreverFaixa(faixa: FaixaTaxa): string {
  return faixa.fixaCentavos > 0 ? `${faixa.percentual}% + ${reais(faixa.fixaCentavos)}` : `${faixa.percentual}%`;
}

/** Campo numérico curto: rótulo, valor e unidade ao lado. Aceita só dígitos, vírgula e ponto. */
function Campo({
  id,
  rotulo,
  unidade,
  valor,
  onChange,
  dica,
  desabilitado,
}: {
  id: string;
  rotulo: string;
  unidade?: string;
  valor: string;
  onChange: (valor: string) => void;
  dica?: string;
  desabilitado?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{rotulo}</label>
      <div className={calc.campoUnidade}>
        <input
          id={id}
          inputMode="decimal"
          value={valor}
          disabled={desabilitado}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        />
        {unidade && <span>{unidade}</span>}
      </div>
      {dica && <span className={styles.mlLinkAviso}>{dica}</span>}
    </div>
  );
}

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
  /** Verba do bolso já informada — quando houver, vira o orçamento diário. */
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
              <strong className={calc.valorCampanha}>{reais(verbaDiariaCentavos)}</strong> (sua verba de{" "}
              {reais(verbaMesCentavos!)} ÷ {dias} dias)
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
        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => onUsarVerba(((inicioDiarioCentavos * dias) / 100).toFixed(2))}
        >
          Usar {reais(inicioDiarioCentavos)}/dia ({reais(inicioDiarioCentavos * dias)}/mês) como verba
        </button>
      )}
    </div>
  );
}

/** Cálculo salvo reaberto na calculadora — ausente = cálculo novo. */
export interface CalculoInicial {
  id: string;
  nome: string;
  linkModelo3d?: string;
  linkShopee?: string;
  linkMercadoLivre?: string;
  valores: CalculadoraValores;
  produtoId?: string;
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

/** Resultado de um canal no preço praticado (com ou sem anúncio embutido). */
interface ResultadoCanal {
  precoCentavos: number;
  /** Preço sem nenhum anúncio — referência no modo "embutido". */
  precoSemAnuncioCentavos: number | null;
  venda: DetalheVenda;
  limite: LimiteAnuncio;
}

export default function CalculadoraRapida({
  taxasGlobais,
  calculoInicial,
}: {
  taxasGlobais: TaxasCanaisConfig;
  calculoInicial?: CalculoInicial;
}) {
  const router = useRouter();
  const inicial = calculoInicial?.valores ?? valoresPadrao();
  const [custo, setCusto] = useState<CustoProducaoFormValores>(inicial.custo);
  const [alturaCm, setAlturaCm] = useState(inicial.alturaCm ?? "");
  const [margem, setMargem] = useState(inicial.margemMinimaPrecoPercentual ?? "25");
  const [anuncio, setAnuncio] = useState<AnuncioCalculadoraValores>(inicial.anuncio ?? ANUNCIO_PADRAO);
  const [precoConcorrente, setPrecoConcorrente] = useState(inicial.precoConcorrenteReais ?? "");
  const [canais, setCanais] = useState<Record<Marketplace, CanalForm>>(inicial.canais);
  const [producao, setProducao] = useState(inicial.producao);
  const [nome, setNome] = useState(calculoInicial?.nome ?? "");
  const [linkModelo, setLinkModelo] = useState(calculoInicial?.linkModelo3d ?? "");
  const [linkShopee, setLinkShopee] = useState(calculoInicial?.linkShopee ?? "");
  const [linkMercadoLivre, setLinkMercadoLivre] = useState(calculoInicial?.linkMercadoLivre ?? "");
  const [calculoId, setCalculoId] = useState(calculoInicial?.id ?? null);
  const [produtoId, setProdutoId] = useState(calculoInicial?.produtoId ?? null);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Nome da cópia sendo digitado — `null` = formulário de duplicar fechado. */
  const [nomeCopia, setNomeCopia] = useState<string | null>(null);
  const [duplicando, setDuplicando] = useState(false);
  const [erroDuplicar, setErroDuplicar] = useState<string | null>(null);

  const alterarCusto = (chave: keyof CustoProducaoFormValores) => (valor: string) =>
    setCusto((atual) => ({ ...atual, [chave]: valor }));
  const alterarCanal = (canal: Marketplace, chave: "taxaPercentual" | "taxaFixaReais") => (valor: string) =>
    setCanais((atual) => ({ ...atual, [canal]: { ...atual[canal], [chave]: valor } }));
  const alterarProducao = (chave: keyof typeof producao) => (valor: string) =>
    setProducao((atual) => ({ ...atual, [chave]: valor }));
  const alterarAnuncio = (chave: "roasMeta" | "verbaMesReais") => (valor: string) =>
    setAnuncio((atual) => ({ ...atual, [chave]: valor }));

  const custoProducao = montarCustoProducao(custo);
  const cogs = custoProducao ? calcularCustoProducao(custoProducao) : null;
  const margemNumero = numero(margem);
  const margemValida = margem.trim() !== "" && Number.isFinite(margemNumero) && margemNumero >= 0 && margemNumero < 100;

  const roas = numero(anuncio.roasMeta);
  const roasValido = Number.isFinite(roas) && roas > 0;
  const verbaCentavos = Math.round((numero(anuncio.verbaMesReais) || 0) * 100);
  const anuncioEmbutidoPercentual = anuncio.modo === "embutido" && roasValido ? 100 / roas : 0;

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

  const faixasDoCanal = (canal: Marketplace): FaixaTaxa[] | null => faixasDoCanalSalvo(canal, canais);

  function resultadoCanal(canal: Marketplace): ResultadoCanal | null {
    const faixas = faixasDoCanal(canal);
    if (!cogs || !margemValida || !faixas) return null;
    const base = { custoCentavos: cogs.totalCentavos, faixas, margemPrecoPercentual: margemNumero };
    const precoSemAnuncioCentavos = calcularPrecoPorMargem({ ...base, anuncioPercentual: 0 });
    const precoCentavos =
      anuncioEmbutidoPercentual > 0
        ? calcularPrecoPorMargem({ ...base, anuncioPercentual: anuncioEmbutidoPercentual })
        : precoSemAnuncioCentavos;
    if (precoCentavos === null) return null;

    const venda = detalharVenda({
      precoCentavos,
      faixas,
      custoCentavos: cogs.totalCentavos,
      anuncioPercentual: anuncioEmbutidoPercentual,
    });
    const limite = calcularLimiteAnuncio({
      precoCentavos,
      taxaCentavos: venda.taxaCentavos,
      custoCentavos: cogs.totalCentavos,
      margemMinimaPrecoPercentual: margemNumero,
    });
    return { precoCentavos, precoSemAnuncioCentavos, venda, limite };
  }

  const resultados: Record<Marketplace, ResultadoCanal | null> = {
    shopee: resultadoCanal("shopee"),
    mercadoLivre: resultadoCanal("mercadoLivre"),
  };

  // Venda direta (em mãos, WhatsApp, feira): sem taxa de plataforma e sem anúncio — só custo + lucro.
  const precoDiretoCentavos =
    cogs && margemValida
      ? calcularPrecoPorMargem({
          custoCentavos: cogs.totalCentavos,
          faixas: faixaUnica(0, 0),
          margemPrecoPercentual: margemNumero,
          anuncioPercentual: 0,
        })
      : null;

  // Preço do site no produto: mesmo lucro em % do preço, com a taxa do site próprio e sem anúncio.
  const precoSiteCentavos =
    cogs && margemValida
      ? calcularPrecoPorMargem({
          custoCentavos: cogs.totalCentavos,
          faixas: faixaUnica(taxasGlobais.siteTaxaPercentual, taxasGlobais.siteTaxaFixaCentavos),
          margemPrecoPercentual: margemNumero,
          anuncioPercentual: 0,
        })
      : null;

  const podeSalvarCalculo = nome.trim() !== "" && !salvando;
  const podeCriarProduto = podeSalvarCalculo && custoProducao !== null && precoSiteCentavos !== null && !produtoId;

  /** O que está na tela agora, no formato gravado do cálculo. */
  function valoresAtuais(): CalculadoraValores {
    return {
      custo,
      alturaCm: alturaCm.trim(),
      margemMinimaPrecoPercentual: margem,
      anuncio,
      canais,
      producao,
      pecasPorMes: pecasMes,
      precoConcorrenteReais: precoConcorrente,
    };
  }

  /** Grava (cria ou atualiza) o cálculo — `false` se a API recusar (o erro já fica na tela). */
  async function gravarCalculo(produtoCriadoId?: string): Promise<boolean> {
    const valores = valoresAtuais();
    const resposta = await fetch(calculoId ? `/api/admin/calculos-preco/${calculoId}` : "/api/admin/calculos-preco", {
      method: calculoId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nome.trim(),
        linkModelo3d: linkModelo.trim(),
        linkShopee: linkShopee.trim(),
        linkMercadoLivre: linkMercadoLivre.trim(),
        produtoId: produtoCriadoId ?? produtoId ?? undefined,
        valores,
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

  /** Cria um cálculo novo com o que está na tela e outro nome (ex: o mesmo produto em outro tamanho) e abre a cópia. */
  async function duplicarCalculo() {
    if (nomeCopia === null || nomeCopia.trim() === "" || duplicando) return;
    setDuplicando(true);
    setErroDuplicar(null);
    try {
      const resposta = await fetch("/api/admin/calculos-preco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeCopia.trim(),
          linkModelo3d: linkModelo.trim(),
          linkShopee: linkShopee.trim(),
          linkMercadoLivre: linkMercadoLivre.trim(),
          // A cópia ainda não é produto: fica sem o vínculo do original.
          valores: valoresAtuais(),
        }),
      });
      if (!resposta.ok) {
        setErroDuplicar(`${await mensagemDeErro(resposta)} (status ${resposta.status})`);
        return;
      }
      const { calculo } = await resposta.json();
      router.push(`/admin/produtos/calculadora?id=${String(calculo._id)}`);
      router.refresh();
    } catch (erro) {
      setErroDuplicar(`Não foi possível duplicar: ${erro instanceof Error ? erro.message : String(erro)}`);
    } finally {
      setDuplicando(false);
    }
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
    if (!podeCriarProduto || !custoProducao || !cogs || precoSiteCentavos === null) return;
    setSalvando(true);
    setErroSalvar(null);
    setAviso(null);
    try {
      const precosCanais: { shopee?: number; mercadoLivre?: number } = {};
      if (resultados.shopee) precosCanais.shopee = resultados.shopee.precoCentavos;
      if (resultados.mercadoLivre) precosCanais.mercadoLivre = resultados.mercadoLivre.precoCentavos;

      // O cadastro guarda a margem sobre o custo: converte o lucro do preço do site.
      const vendaSite = detalharVenda({
        precoCentavos: precoSiteCentavos,
        faixas: faixaUnica(taxasGlobais.siteTaxaPercentual, taxasGlobais.siteTaxaFixaCentavos),
        custoCentavos: cogs.totalCentavos,
        anuncioPercentual: 0,
      });
      const margemSobreCusto =
        cogs.totalCentavos > 0 ? Math.max(0, Math.round((vendaSite.lucroCentavos / cogs.totalCentavos) * 100)) : 0;

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
            shopeeTaxaPercentual: resultados.shopee?.venda.faixa.percentual ?? numero(canais.shopee.taxaPercentual),
            margemDesejadaPercentual: margemSobreCusto,
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
            <Campo id="altura" rotulo="Altura da peça (opcional)" unidade="cm" valor={alturaCm} onChange={setAlturaCm} dica="Para separar tamanhos: gato 5 cm, 10 cm…" />
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
          <h2>Lucro e anúncio</h2>
          <Campo
            id="margem"
            rotulo="Quero ganhar"
            unidade="% do preço"
            valor={margem}
            onChange={setMargem}
            dica="Quanto de cada venda fica para você, já pagos custo, taxa e anúncio. Ex: 25 = R$ 10 numa venda de R$ 40."
          />

          <div className={styles.field}>
            <label>Como vai pagar o anúncio (Ads)?</label>
            <div className={calc.opcoes}>
              {MODOS_ANUNCIO.map(({ modo, rotulo }) => (
                <button
                  key={modo}
                  type="button"
                  className={anuncio.modo === modo ? styles.btnPrimary : styles.btnGhost}
                  aria-pressed={anuncio.modo === modo}
                  onClick={() => setAnuncio((atual) => ({ ...atual, modo }))}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <span className={styles.mlLinkAviso}>
              {MODOS_ANUNCIO.find((m) => m.modo === anuncio.modo)?.explicacao}
            </span>
          </div>

          {anuncio.modo !== "sem" && (
            <div className={calc.campos3}>
              <Campo
                id="roasMeta"
                rotulo="Meta de ROAS"
                unidade="x"
                valor={anuncio.roasMeta}
                onChange={alterarAnuncio("roasMeta")}
                dica={
                  roasValido
                    ? `R$ ${formatarRoas(roas)} vendidos a cada R$ 1 de anúncio (${formatarAcos(roas)} da venda vai para o anúncio).`
                    : "Ex: 8"
                }
              />
              {anuncio.modo === "bolso" && (
                <Campo
                  id="verbaMes"
                  rotulo="Verba do bolso por mês"
                  unidade="R$"
                  valor={anuncio.verbaMesReais}
                  onChange={alterarAnuncio("verbaMesReais")}
                  dica="Dinheiro que você separa para anúncio, fora do preço."
                />
              )}
            </div>
          )}

          <div className={calc.linhaCanal}>
            <strong>Shopee</strong>
            <label className={canais.shopee.taxaPorFaixa !== false ? calc.checkFaixa : calc.checkFaixaCurto}>
              <input
                type="checkbox"
                checked={canais.shopee.taxaPorFaixa !== false}
                onChange={(e) =>
                  setCanais((atual) => ({ ...atual, shopee: { ...atual.shopee, taxaPorFaixa: e.target.checked } }))
                }
              />
              Taxa automática pela faixa de preço
            </label>
            {canais.shopee.taxaPorFaixa === false && (
              <>
                <Campo id="taxa-shopee" rotulo="Comissão" unidade="%" valor={canais.shopee.taxaPercentual} onChange={alterarCanal("shopee", "taxaPercentual")} />
                <Campo id="fixa-shopee" rotulo="Taxa fixa por venda" unidade="R$" valor={canais.shopee.taxaFixaReais} onChange={alterarCanal("shopee", "taxaFixaReais")} />
              </>
            )}
          </div>
          {canais.shopee.taxaPorFaixa !== false && (
            <>
              <label className={calc.checkFaixaCurto}>
                <input
                  type="checkbox"
                  checked={canais.shopee.cpfAcima450Pedidos === true}
                  onChange={(e) =>
                    setCanais((atual) => ({ ...atual, shopee: { ...atual.shopee, cpfAcima450Pedidos: e.target.checked } }))
                  }
                />
                Conta CPF com mais de 450 pedidos em 90 dias (+ R$ 3 por item)
              </label>
              <span className={styles.mlLinkAviso}>
                Até R$ 79,99: 20% + R$ 4,50 · R$ 80–99,99: 14% + R$ 16 · R$ 100–199,99: 14% + R$ 20 · R$ 200+: 14% +
                R$ 26. Já inclui frete grátis e taxa de transação (tabela de 01/10/2026).
              </span>
            </>
          )}
          <div className={calc.linhaCanal}>
            <strong>Mercado Livre</strong>
            <Campo id="taxa-mercadoLivre" rotulo="Comissão" unidade="%" valor={canais.mercadoLivre.taxaPercentual} onChange={alterarCanal("mercadoLivre", "taxaPercentual")} dica="Clássico ~14% · Premium ~19%" />
            <Campo id="fixa-mercadoLivre" rotulo="Custo fixo abaixo de R$ 79" unidade="R$" valor={canais.mercadoLivre.taxaFixaReais} onChange={alterarCanal("mercadoLivre", "taxaFixaReais")} dica="Por unidade, varia com o peso" />
          </div>
        </section>

        <section className={calc.bloco}>
          <h2>Concorrente</h2>
          <Campo
            id="precoConcorrente"
            rotulo="Preço do concorrente (opcional)"
            unidade="R$"
            valor={precoConcorrente}
            onChange={setPrecoConcorrente}
            dica="O preço de 1 unidade do mesmo produto. Prefira o preço normal, não o de oferta relâmpago."
          />
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
          const ehMl = canal === "mercadoLivre";
          const retorno =
            r && anuncio.modo === "bolso" && roasValido
              ? calcularRetornoVerba({
                  verbaCentavos,
                  roas,
                  precoCentavos: r.precoCentavos,
                  lucroPorPecaCentavos: r.venda.lucroCentavos,
                })
              : null;
          const lucroMesCentavos = r
            ? r.venda.lucroCentavos * pecasMesNumero - (anuncio.modo === "bolso" ? verbaCentavos : 0)
            : 0;

          return (
            <div key={canal} className={calc.cartaoCanal}>
              <span className={calc.nomeCanal}>{NOME_MARKETPLACE[canal]}</span>
              {!cogs || !margemValida ? (
                <span className={styles.mlLinkAviso}>Preencha o custo da peça e quanto quer ganhar.</span>
              ) : !r ? (
                <span className={styles.fieldError}>
                  Não existe preço que pague taxa{anuncio.modo === "embutido" ? ", anúncio" : ""} e {margemNumero}% de
                  lucro. Baixe o lucro{anuncio.modo === "embutido" ? " ou suba a meta de ROAS" : ""}.
                </span>
              ) : (
                <>
                  <span className={calc.preco}>{reais(r.precoCentavos)}</span>
                  <span className={calc.precoLegenda}>
                    venda por esse preço
                    {anuncio.modo === "embutido" &&
                      r.precoSemAnuncioCentavos !== null &&
                      ` · sem anúncio seria ${reais(r.precoSemAnuncioCentavos)}`}
                  </span>
                  <dl className={calc.conta}>
                    <dt>Taxa ({descreverFaixa(r.venda.faixa)})</dt>
                    <dd>− {reais(r.venda.taxaCentavos)}</dd>
                    {anuncio.modo === "embutido" && (
                      <>
                        <dt>Anúncio (Ads)</dt>
                        <dd>− {reais(r.venda.anuncioCentavos)}</dd>
                      </>
                    )}
                    <dt>Custo da peça</dt>
                    <dd>− {reais(cogs.totalCentavos)}</dd>
                    <dt className={calc.lucro}>Seu lucro por peça</dt>
                    <dd className={calc.lucro}>
                      {reais(r.venda.lucroCentavos)} ({r.venda.margemPrecoPercentual.toFixed(0)}%)
                    </dd>
                  </dl>
                  {canal === "shopee" && canais.shopee.taxaPorFaixa !== false && r.precoCentavos < 1200 && (
                    <span className={styles.fieldWarning}>
                      Abaixo de R$ 12 a Shopee cobra uma taxa por item menor (regressiva). A conta usa a padrão, então
                      o lucro real fica um pouco maior.
                    </span>
                  )}

                  {anuncio.modo === "embutido" && roasValido && (
                    <div className={calc.anuncio}>
                      <strong>Anúncio pago pelo comprador (já está no preço)</strong>
                      <PreencherCampanha
                        ehMl={ehMl}
                        roas={roas}
                        custoPorVendaCentavos={r.venda.anuncioCentavos}
                        pecasMes={pecasMesNumero}
                        diasMes={numero(producao.diasPorMes)}
                      />
                      <div className={calc.tabelaRoas}>
                        <strong>Quer um preço menor? Suba a Meta de ROAS</strong>
                        <span className={styles.mlLinkAviso}>
                          ROAS maior = menos anúncio por venda = preço menor. Mas a {ehMl ? "plataforma" : "Shopee"}{" "}
                          mostra menos o produto.
                        </span>
                        {[5, 8, 10, 15, 20].map((opcao) => {
                          const preco = calcularPrecoPorMargem({
                            custoCentavos: cogs.totalCentavos,
                            faixas: faixasDoCanal(canal)!,
                            margemPrecoPercentual: margemNumero,
                            anuncioPercentual: 100 / opcao,
                          });
                          if (preco === null) return null;
                          return (
                            <button
                              key={opcao}
                              type="button"
                              className={opcao === roas ? calc.opcaoRoasAtual : calc.opcaoRoas}
                              onClick={() => setAnuncio((atual) => ({ ...atual, roasMeta: String(opcao) }))}
                            >
                              <span>{ehMl ? `ACOS ${formatarAcos(opcao)}` : `ROAS ${opcao}`}</span>
                              <strong>{reais(preco)}</strong>
                            </button>
                          );
                        })}
                        {r.precoSemAnuncioCentavos !== null && (
                          <span className={styles.mlLinkAviso}>Sem anúncio: {reais(r.precoSemAnuncioCentavos)}</span>
                        )}
                      </div>
                      <strong>Depois, confira o ROAS real no painel:</strong>
                      <span className={calc.semaforoVerde}>
                        ROAS real {formatarRoas(roas)} ou mais: você ganha {margemNumero}% ou mais
                      </span>
                      {r.limite.roasPrejuizo !== null && (
                        <>
                          <span className={calc.semaforoAmarelo}>
                            Entre {formatarRoas(r.limite.roasPrejuizo)} e {formatarRoas(roas)}: lucra, mas menos de{" "}
                            {margemNumero}%
                          </span>
                          <span className={calc.roasPrejuizo}>
                            Abaixo de {formatarRoas(r.limite.roasPrejuizo)}: prejuízo. Pause o anúncio.
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {anuncio.modo === "bolso" && retorno && (
                    <div className={calc.anuncio}>
                      <strong>Anúncio pago do seu bolso</strong>
                      <PreencherCampanha
                        ehMl={ehMl}
                        roas={roas}
                        custoPorVendaCentavos={Math.round(r.precoCentavos / roas)}
                        pecasMes={pecasMesNumero}
                        diasMes={numero(producao.diasPorMes)}
                        verbaMesCentavos={verbaCentavos}
                        onUsarVerba={alterarAnuncio("verbaMesReais")}
                      />
                      <span>
                        Cada venda pelo anúncio custa ~{reais(Math.round(r.precoCentavos / roas))} e deixa ~
                        <strong>{reais(r.venda.lucroCentavos - Math.round(r.precoCentavos / roas))}</strong> de lucro
                      </span>
                      {verbaCentavos > 0 ? (
                        <>
                          <span>
                            {reais(verbaCentavos)} devem trazer ~<strong>{retorno.vendas} vendas</strong> (
                            {reais(retorno.receitaCentavos)})
                          </span>
                          <span className={retorno.saldoCentavos >= 0 ? calc.semaforoVerde : calc.roasPrejuizo}>
                            Lucro dessas vendas {reais(retorno.lucroVendasCentavos)} − verba {reais(verbaCentavos)} ={" "}
                            {reais(retorno.saldoCentavos)}
                          </span>
                          {retorno.vendas > pecasMesNumero && pecasMesNumero > 0 && (
                            <span className={calc.semaforoAmarelo}>
                              Mais vendas que a sua produção do mês ({pecasMesNumero} peças).
                            </span>
                          )}
                        </>
                      ) : (
                        <span className={styles.mlLinkAviso}>Informe a verba do mês para ver o retorno.</span>
                      )}
                      {retorno.roasEquilibrio !== null && (
                        <span className={calc.roasPrejuizo}>
                          ROAS real abaixo de {formatarRoas(retorno.roasEquilibrio)}: o anúncio não se paga. Pause.
                        </span>
                      )}
                    </div>
                  )}

                  {(() => {
                    const faixas = faixasDoCanal(canal)!;
                    const concorrenteCentavos = Math.round((numero(precoConcorrente) || 0) * 100);
                    const embalagemCentavos = cogs.custoEmbalagemCentavos;
                    const kits = [2, 3, 4].map((unidades) => ({
                      unidades,
                      preco: calcularPrecoPorMargem({
                        custoCentavos: calcularCustoKit(cogs.totalCentavos, embalagemCentavos, unidades),
                        faixas,
                        margemPrecoPercentual: margemNumero,
                        anuncioPercentual: anuncioEmbutidoPercentual,
                      }),
                    }));

                    let concorrente = null;
                    if (concorrenteCentavos > 0) {
                      const vendaNoPreco = detalharVenda({
                        precoCentavos: concorrenteCentavos,
                        faixas,
                        custoCentavos: cogs.totalCentavos,
                        anuncioPercentual: anuncioEmbutidoPercentual,
                      });
                      const custoMaximo = calcularCustoMaximo({
                        precoCentavos: concorrenteCentavos,
                        faixas,
                        anuncioPercentual: anuncioEmbutidoPercentual,
                        margemPrecoPercentual: margemNumero,
                      });
                      const precoMinimo = calcularPrecoPorMargem({
                        custoCentavos: cogs.totalCentavos,
                        faixas,
                        margemPrecoPercentual: 0,
                        anuncioPercentual: anuncioEmbutidoPercentual,
                      });
                      const kitQueBate = kits.find(
                        (k) => k.preco !== null && Math.ceil(k.preco / k.unidades) <= concorrenteCentavos
                      );
                      concorrente = (
                        <div className={calc.concorrente}>
                          <strong>Contra o concorrente ({reais(concorrenteCentavos)})</strong>
                          <span className={vendaNoPreco.lucroCentavos >= 0 ? undefined : calc.roasPrejuizo}>
                            Vendendo por {reais(concorrenteCentavos)} você{" "}
                            {vendaNoPreco.lucroCentavos >= 0 ? "ganha" : "perde"}{" "}
                            <strong>{reais(Math.abs(vendaNoPreco.lucroCentavos))}</strong> por peça (
                            {vendaNoPreco.margemPrecoPercentual.toFixed(0)}%)
                          </span>
                          {precoMinimo !== null && <span>Abaixo de {reais(precoMinimo)} você tem prejuízo.</span>}
                          {(() => {
                            // Quanto de anúncio cabe vendendo no preço dele e ainda ganhando a margem.
                            const vendaSemAnuncio = detalharVenda({
                              precoCentavos: concorrenteCentavos,
                              faixas,
                              custoCentavos: cogs.totalCentavos,
                              anuncioPercentual: 0,
                            });
                            const limite = calcularLimiteAnuncio({
                              precoCentavos: concorrenteCentavos,
                              taxaCentavos: vendaSemAnuncio.taxaCentavos,
                              custoCentavos: cogs.totalCentavos,
                              margemMinimaPrecoPercentual: margemNumero,
                            });
                            return limite.roasMinimo !== null ? (
                              <span className={calc.semaforoVerde}>
                                Vendendo no preço dele com {margemNumero}% de lucro, dá para anunciar com{" "}
                                {ehMl ? `ACOS objetivo até ${formatarAcos(limite.roasMinimo)}` : `Meta de ROAS ${formatarRoas(limite.roasMinimo)}`}{" "}
                                (até {reais(limite.tetoAnuncioCentavos)} de anúncio por venda).
                              </span>
                            ) : (
                              <span className={calc.semaforoAmarelo}>
                                No preço dele não sobra nada para anúncio com {margemNumero}% de lucro.
                              </span>
                            );
                          })()}
                          <span>
                            Para ganhar {margemNumero}% nesse preço, sua peça teria que custar{" "}
                            {custoMaximo > 0 ? (
                              <>
                                no máximo <strong>{reais(custoMaximo)}</strong> (hoje custa {reais(cogs.totalCentavos)})
                              </>
                            ) : (
                              <strong>menos que zero — impossível</strong>
                            )}
                          </span>
                          {r.precoCentavos > concorrenteCentavos && (
                            <span className={kitQueBate ? calc.semaforoVerde : calc.semaforoAmarelo}>
                              {kitQueBate
                                ? `Kit com ${kitQueBate.unidades} sai ${reais(Math.ceil(kitQueBate.preco! / kitQueBate.unidades))} cada, com seus ${margemNumero}% — mais barato que ele por unidade.`
                                : "Nem em kit fica mais barato que ele por unidade. Concorra com qualidade, fotos e cores, não com preço."}
                            </span>
                          )}
                        </div>
                      );
                    }

                    return (
                      <>
                        {concorrente}
                        <div className={calc.kits}>
                          <strong>Avulso ou em kit? (kit usa uma embalagem só)</strong>
                          <span className={styles.mlLinkAviso}>
                            Mês = as {pecasMesNumero} peças da produção vendidas desse jeito
                            {anuncio.modo === "bolso" && verbaCentavos > 0 ? ", já tirando a verba do bolso" : ""}.
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
                                {[{ unidades: 1, preco: r.precoCentavos }, ...kits].map((k) => {
                                  if (k.preco === null) return null;
                                  const custoPedido = calcularCustoKit(cogs.totalCentavos, embalagemCentavos, k.unidades);
                                  const lucroPedido = detalharVenda({
                                    precoCentavos: k.preco,
                                    faixas,
                                    custoCentavos: custoPedido,
                                    anuncioPercentual: anuncioEmbutidoPercentual,
                                  }).lucroCentavos;
                                  const pedidosMes = Math.floor(pecasMesNumero / k.unidades);
                                  const liquidoMes =
                                    lucroPedido * pedidosMes - (anuncio.modo === "bolso" ? verbaCentavos : 0);
                                  return (
                                    <tr key={k.unidades}>
                                      <th scope="row">{k.unidades === 1 ? "Avulso" : `Kit ${k.unidades}`}</th>
                                      <td>
                                        {reais(k.preco)}
                                        {k.unidades > 1 && (
                                          <span className={calc.cadaUm}>{reais(Math.ceil(k.preco / k.unidades))} cada</span>
                                        )}
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
                      </>
                    );
                  })()}

                  <div className={calc.mes}>
                    <span>Vendendo {pecasMesNumero} peças no mês</span>
                    <span>
                      Faturamento bruto <strong>{reais(r.precoCentavos * pecasMesNumero)}</strong>
                    </span>
                    <span>
                      Lucro líquido{anuncio.modo === "bolso" && verbaCentavos > 0 ? " (− verba)" : ""}{" "}
                      <strong>{reais(lucroMesCentavos)}</strong>
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}

        <div className={`${calc.cartaoCanal} ${calc.cartaoDireta}`}>
          <span className={calc.nomeCanal}>Venda direta · sem taxa</span>
          <span className={calc.avisoDireta}>
            Só para vender fora dos marketplaces: em mãos, WhatsApp, Instagram ou feira. Não use este preço na Shopee nem
            no Mercado Livre — lá a taxa sai do seu lucro.
          </span>
          {!cogs || !margemValida || precoDiretoCentavos === null ? (
            <span className={styles.mlLinkAviso}>Preencha o custo da peça e quanto quer ganhar.</span>
          ) : (
            <>
              <span className={calc.preco}>{reais(precoDiretoCentavos)}</span>
              <span className={calc.precoLegenda}>sem taxa de plataforma e sem anúncio</span>
              <dl className={calc.conta}>
                <dt>Taxa</dt>
                <dd>R$ 0,00</dd>
                <dt>Custo da peça</dt>
                <dd>− {reais(cogs.totalCentavos)}</dd>
                <dt className={calc.lucro}>Seu lucro por peça</dt>
                <dd className={calc.lucro}>
                  {reais(precoDiretoCentavos - cogs.totalCentavos)} (
                  {(((precoDiretoCentavos - cogs.totalCentavos) / precoDiretoCentavos) * 100).toFixed(0)}%)
                </dd>
              </dl>
              <span className={styles.mlLinkAviso}>
                O custo inclui a embalagem ({reais(cogs.custoEmbalagemCentavos)}). Se entregar sem embalagem, dá para
                cobrar um pouco menos.
              </span>
              <div className={calc.mes}>
                <span>Vendendo {pecasMesNumero} peças no mês</span>
                <span>
                  Faturamento bruto <strong>{reais(precoDiretoCentavos * pecasMesNumero)}</strong>
                </span>
                <span>
                  Lucro líquido <strong>{reais((precoDiretoCentavos - cogs.totalCentavos) * pecasMesNumero)}</strong>
                </span>
              </div>
            </>
          )}
        </div>

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
          <div className={styles.field}>
            <label htmlFor="linkShopee">Mesmo produto na Shopee (opcional)</label>
            <input
              id="linkShopee"
              type="url"
              value={linkShopee}
              onChange={(e) => setLinkShopee(e.target.value)}
              placeholder="https://shopee.com.br/..."
            />
            {linkShopee.trim() && (
              <a href={linkShopee.trim()} target="_blank" rel="noopener noreferrer" className={styles.mlLinkAviso}>
                Abrir anúncio ↗
              </a>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="linkMercadoLivre">Mesmo produto no Mercado Livre (opcional)</label>
            <input
              id="linkMercadoLivre"
              type="url"
              value={linkMercadoLivre}
              onChange={(e) => setLinkMercadoLivre(e.target.value)}
              placeholder="https://www.mercadolivre.com.br/..."
            />
            {linkMercadoLivre.trim() && (
              <a href={linkMercadoLivre.trim()} target="_blank" rel="noopener noreferrer" className={styles.mlLinkAviso}>
                Abrir anúncio ↗
              </a>
            )}
          </div>
          <button type="button" className={styles.btnPrimary} disabled={!podeSalvarCalculo} onClick={salvarCalculo}>
            {salvando ? "Salvando…" : calculoId ? "Salvar alterações" : "Salvar cálculo"}
          </button>
          <span className={styles.mlLinkAviso}>
            Fica em &quot;Cálculos salvos&quot; para você voltar e ajustar. Ainda não vira produto.
          </span>
          {aviso && <span className={styles.formSuccess}>{aviso}</span>}
          {erroSalvar && <span className={styles.fieldError}>{erroSalvar}</span>}

          {calculoId &&
            (nomeCopia === null ? (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => {
                  setErroDuplicar(null);
                  setNomeCopia(`${nome.trim()} (cópia)`);
                }}
              >
                Duplicar com outro nome
              </button>
            ) : (
              <div className={calc.duplicar}>
                <div className={styles.field}>
                  <label htmlFor="nomeCopia">Nome da cópia</label>
                  <input
                    id="nomeCopia"
                    value={nomeCopia}
                    autoFocus
                    onChange={(e) => setNomeCopia(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") duplicarCalculo();
                      if (e.key === "Escape") setNomeCopia(null);
                    }}
                    placeholder="Ex: Gato 10 cm"
                  />
                </div>
                <span className={styles.mlLinkAviso}>
                  Copia tudo o que está na tela (mesmo o que não foi salvo) e abre a cópia para você ajustar tempo,
                  filamento e altura. Este cálculo continua como está.
                </span>
                <div className={calc.opcoes}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    disabled={nomeCopia.trim() === "" || duplicando}
                    onClick={duplicarCalculo}
                  >
                    {duplicando ? "Duplicando…" : "Criar cópia"}
                  </button>
                  <button type="button" className={styles.btnGhost} onClick={() => setNomeCopia(null)}>
                    Cancelar
                  </button>
                </div>
                {erroDuplicar && <span className={styles.fieldError}>{erroDuplicar}</span>}
              </div>
            ))}

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
