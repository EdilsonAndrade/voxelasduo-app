"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import calc from "./calculadoraRapida.module.css";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import type {
  AnuncioCalculadoraValores,
  CalculadoraValores,
  CalculadoraValoresV2,
  CanalCalculadoraValores,
  ImpressaoCalculadora,
  PrecificacaoCalculadora,
  VendaDiretaCalculadora,
} from "@/lib/models/calculoPreco";
import { ANUNCIO_PADRAO, valoresPadrao } from "@/lib/produtos/calculadoraPadrao";
import { normalizarValores } from "@/lib/produtos/calculadoraValores";
import { detalharVenda, faixaUnica } from "@/lib/produtos/calculadoraRapida";
import type { CanalVenda } from "@/lib/produtos/canaisCalculadora";
import { paraCustoProducao } from "@/lib/produtos/custoCalculadora";
import { calcularResultado } from "@/lib/produtos/resultadoCalculadora";
import Resumo from "./calculadora/Resumo";
import SecaoCanalVenda from "./calculadora/SecaoCanalVenda";
import SecaoCustosExtras from "./calculadora/SecaoCustosExtras";
import SecaoImpressao from "./calculadora/SecaoImpressao";
import SecaoModelo from "./calculadora/SecaoModelo";
import SecaoPrecificacao from "./calculadora/SecaoPrecificacao";
import { SecaoAds, SecaoConcorrente, SecaoProducao } from "./calculadora/SecoesEstrategia";
import { numero, reais } from "./calculadora/formato";

/** Cálculo salvo reaberto na calculadora — ausente = cálculo novo. */
export interface CalculoInicial {
  /** Ausente = ainda não salvo (ex: aberto a partir de um produto). */
  id?: string;
  nome: string;
  linkModelo3d?: string;
  linkShopee?: string;
  linkMercadoLivre?: string;
  valores: CalculadoraValores;
  produtoId?: string;
}

export interface ProdutoVinculado {
  id: string;
  /** Custo de produção salvo no cadastro — `null` = não configurado. */
  custoCadastroCentavos: number | null;
}

async function mensagemDeErro(resposta: Response): Promise<string> {
  const dados = await resposta.json().catch(() => ({}));
  const campos = dados.campos ? ` ${Object.values(dados.campos).join(" ")}` : "";
  return `${dados.erro ?? `Erro ${resposta.status} ao salvar.`}${campos} (status ${resposta.status})`;
}

export default function CalculadoraRapida({
  taxasGlobais,
  calculoInicial,
  produtoVinculado,
}: {
  taxasGlobais: TaxasCanaisConfig;
  calculoInicial?: CalculoInicial;
  /** Produto ligado ao cálculo — traz o custo do cadastro para comparar. */
  produtoVinculado?: ProdutoVinculado;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<CalculadoraValoresV2>(() =>
    calculoInicial ? normalizarValores(calculoInicial.valores) : valoresPadrao()
  );
  const [aba, setAba] = useState<CanalVenda>("shopee");
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

  const mudar = (parcial: Partial<CalculadoraValoresV2>) => setValores((atual) => ({ ...atual, ...parcial }));
  const alterarImpressao = (parcial: Partial<ImpressaoCalculadora>) =>
    setValores((atual) => ({ ...atual, impressao: { ...atual.impressao, ...parcial } }));
  const alterarPrecificacao = (parcial: Partial<PrecificacaoCalculadora>) =>
    setValores((atual) => ({ ...atual, precificacao: { ...atual.precificacao, ...parcial } }));
  const alterarDireta = (parcial: Partial<VendaDiretaCalculadora>) =>
    setValores((atual) => ({ ...atual, vendaDireta: { ...atual.vendaDireta, ...parcial } }));
  const alterarCanal = (canal: "shopee" | "mercadoLivre", parcial: Partial<CanalCalculadoraValores>) =>
    setValores((atual) => ({ ...atual, canais: { ...atual.canais, [canal]: { ...atual.canais[canal], ...parcial } } }));
  const alterarAnuncio = (parcial: Partial<AnuncioCalculadoraValores>) =>
    setValores((atual) => ({ ...atual, anuncio: { ...(atual.anuncio ?? ANUNCIO_PADRAO), ...parcial } }));
  const alterarProducao = (chave: "horasPorDia" | "diasPorMes") => (valor: string) =>
    setValores((atual) => ({ ...atual, producao: { ...atual.producao, [chave]: valor } }));

  const taxaSite = { percentual: taxasGlobais.siteTaxaPercentual, fixaCentavos: taxasGlobais.siteTaxaFixaCentavos };
  const res = calcularResultado(valores, taxaSite);
  const anuncio = valores.anuncio ?? ANUNCIO_PADRAO;

  // "Peças no mês" segue o cálculo automático sempre que ele muda, mas pode ser digitado por cima.
  // Ao reabrir um cálculo salvo, mantém o valor que estava gravado.
  const pecasAuto = res.producao?.pecasPorMes ?? null;
  const [pecasAutoAnterior, setPecasAutoAnterior] = useState<number | null>(pecasAuto);
  if (pecasAuto !== pecasAutoAnterior) {
    setPecasAutoAnterior(pecasAuto);
    mudar({ pecasPorMes: pecasAuto !== null ? String(pecasAuto) : "" });
  }

  const podeSalvarCalculo = nome.trim() !== "" && !salvando;
  const podeCriarProduto = podeSalvarCalculo && res.custo !== null && res.precoSiteCentavos !== null && !produtoId;

  /** O que está na tela agora, no formato gravado do cálculo. */
  function valoresAtuais(): CalculadoraValores {
    return { ...valores, alturaCm: (valores.alturaCm ?? "").trim() };
  }

  function corpoLinks() {
    return { linkModelo3d: linkModelo.trim(), linkShopee: linkShopee.trim(), linkMercadoLivre: linkMercadoLivre.trim() };
  }

  /** Grava (cria ou atualiza) o cálculo — `false` se a API recusar (o erro já fica na tela). */
  async function gravarCalculo(produtoCriadoId?: string): Promise<boolean> {
    const resposta = await fetch(calculoId ? `/api/admin/calculos-preco/${calculoId}` : "/api/admin/calculos-preco", {
      method: calculoId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nome.trim(),
        ...corpoLinks(),
        produtoId: produtoCriadoId ?? produtoId ?? undefined,
        valores: valoresAtuais(),
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
        // A cópia ainda não é produto: fica sem o vínculo do original.
        body: JSON.stringify({ nome: nomeCopia.trim(), ...corpoLinks(), valores: valoresAtuais() }),
      });
      if (!resposta.ok) {
        setErroDuplicar(await mensagemDeErro(resposta));
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
    if (!podeCriarProduto || !res.custo || res.precoSiteCentavos === null) return;
    setSalvando(true);
    setErroSalvar(null);
    setAviso(null);
    try {
      const precosCanais: { shopee?: number; mercadoLivre?: number } = {};
      const shopee = res.canais.shopee?.precoCentavos;
      const mercadoLivre = res.canais.mercadoLivre?.precoCentavos;
      if (shopee != null) precosCanais.shopee = shopee;
      if (mercadoLivre != null) precosCanais.mercadoLivre = mercadoLivre;

      // O cadastro guarda a margem sobre o custo: converte o lucro do preço do site.
      const vendaSite = detalharVenda({
        precoCentavos: res.precoSiteCentavos,
        faixas: faixaUnica(taxaSite.percentual, taxaSite.fixaCentavos),
        custoCentavos: res.custo.totalCentavos,
        anuncioPercentual: 0,
        impostoPercentual: res.impostoPercentual,
      });
      const margemSobreCusto =
        res.custo.totalCentavos > 0 ? Math.max(0, Math.round((vendaSite.lucroCentavos / res.custo.totalCentavos) * 100)) : 0;

      const resposta = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: "Rascunho criado pela calculadora de preço — completar a descrição.",
          preco: res.precoSiteCentavos,
          estoque: 0,
          fotos: [],
          custoProducao: paraCustoProducao(valores.impressao, res.custo),
          taxasCanais: {
            shopeeTaxaPercentual: res.canais.shopee?.venda?.faixa.percentual ?? numero(valores.canais.shopee.taxaPercentual),
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

  const custo = res.custo;
  const extrasCentavos = custo ? custo.embalagemCentavos + custo.acabamentoCentavos + custo.maoDeObraCentavos + custo.outrosCentavos : 0;

  const rodape = (
    <div className={calc.salvar}>
      <button type="button" className={styles.btnPrimary} disabled={!podeSalvarCalculo} onClick={salvarCalculo}>
        {salvando ? "Salvando…" : calculoId ? "Salvar alterações" : "Salvar cálculo"}
      </button>
      <span className={styles.mlLinkAviso}>
        {nome.trim() === "" ? "Dê um nome ao produto (em Modelo) para salvar." : "Fica em \"Cálculos salvos\" para você voltar e ajustar. Ainda não vira produto."}
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
              Copia tudo o que está na tela (mesmo o que não foi salvo) e abre a cópia para você ajustar tempo, filamento e
              altura. Este cálculo continua como está.
            </span>
            <div className={calc.opcoes}>
              <button type="button" className={styles.btnPrimary} disabled={nomeCopia.trim() === "" || duplicando} onClick={duplicarCalculo}>
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
          Ligado a um produto: <Link href={`/admin/produtos/${produtoId}/editar`}>abrir o cadastro do produto</Link>
        </span>
      ) : (
        <>
          <button type="button" className={styles.btnGhost} disabled={!podeCriarProduto} onClick={criarProduto}>
            Transformar em produto rascunho
          </button>
          {res.precoSiteCentavos !== null && (
            <span className={styles.mlLinkAviso}>
              Cria o produto (fora da loja) com custo, margem e preços da Shopee e do Mercado Livre. Preço no site:{" "}
              {reais(res.precoSiteCentavos)}.
            </span>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={calc.grade}>
      <div className={calc.entradas}>
        <p className={calc.introducao}>
          Preencha a peça, os custos e como vai vender: o preço aparece no resumo na hora.
        </p>
        <SecaoModelo
          nome={nome}
          setNome={setNome}
          linkModelo={linkModelo}
          setLinkModelo={setLinkModelo}
          linkShopee={linkShopee}
          setLinkShopee={setLinkShopee}
          linkMercadoLivre={linkMercadoLivre}
          setLinkMercadoLivre={setLinkMercadoLivre}
          alturaCm={valores.alturaCm ?? ""}
          setAlturaCm={(alturaCm) => mudar({ alturaCm })}
        />
        <SecaoImpressao
          impressao={valores.impressao}
          alterar={alterarImpressao}
          resumo={custo ? `${reais(custo.totalCentavos)} por unidade` : "faltam dados"}
        />
        <SecaoCustosExtras impressao={valores.impressao} alterar={alterarImpressao} resumo={custo ? reais(extrasCentavos) : undefined} />
        <SecaoPrecificacao
          precificacao={valores.precificacao}
          alterar={alterarPrecificacao}
          margem={valores.margemMinimaPrecoPercentual ?? ""}
          setMargem={(margemMinimaPrecoPercentual) => mudar({ margemMinimaPrecoPercentual })}
          precoConcorrenteReais={valores.precoConcorrenteReais ?? ""}
          resumo={valores.precificacao.modo === "alvo" ? "Preço alvo" : `Margem de ${valores.margemMinimaPrecoPercentual || "?"}%`}
        />
        <SecaoCanalVenda valores={valores} aba={aba} setAba={setAba} alterarDireta={alterarDireta} alterarCanal={alterarCanal} />
        <SecaoAds anuncio={anuncio} alterar={alterarAnuncio} />
        <SecaoConcorrente
          preco={valores.precoConcorrenteReais ?? ""}
          oferta={valores.precoConcorrenteOfertaReais ?? ""}
          vendas={valores.vendasConcorrenteMes ?? ""}
          setPreco={(precoConcorrenteReais) => mudar({ precoConcorrenteReais })}
          setOferta={(precoConcorrenteOfertaReais) => mudar({ precoConcorrenteOfertaReais })}
          setVendas={(vendasConcorrenteMes) => mudar({ vendasConcorrenteMes })}
        />
        <SecaoProducao
          horasPorDia={valores.producao.horasPorDia}
          diasPorMes={valores.producao.diasPorMes}
          pecasMes={valores.pecasPorMes}
          setHorasPorDia={alterarProducao("horasPorDia")}
          setDiasPorMes={alterarProducao("diasPorMes")}
          setPecasMes={(pecasPorMes) => mudar({ pecasPorMes })}
          producao={res.producao}
        />
      </div>

      <Resumo
        res={res}
        aba={aba}
        setAba={setAba}
        anuncio={anuncio}
        diasMes={numero(valores.producao.diasPorMes)}
        precoConcorrenteReais={valores.precoConcorrenteReais ?? ""}
        precoOfertaReais={valores.precoConcorrenteOfertaReais ?? ""}
        onEscolherRoas={(roasMeta) => alterarAnuncio({ roasMeta })}
        onUsarVerba={(verbaMesReais) => alterarAnuncio({ verbaMesReais })}
        rodape={rodape}
        custoCadastroCentavos={produtoVinculado?.custoCadastroCentavos ?? null}
      />
    </div>
  );
}
