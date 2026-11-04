"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import VerbaDesconto from "@/components/admin/VerbaDesconto";
import { terminoPrevisto } from "@/lib/producao/agenda";
import { ganhoDaPlaca, ganhoDoConjunto, lucroNoPreco, type Ganho, type PlacaGanho } from "@/lib/producao/ganhoImpressao";
import { calcularVerbaDesconto, type CupomLoja } from "@/lib/produtos/verbaDesconto";
import { ROAS_MAXIMO, ROAS_PADRAO, percentualDoAnuncio } from "@/lib/produtos/anuncioPago";
import { minutosEmHoras, quantidadeDoItem } from "@/lib/producao/planosImpressao";
import styles from "./tempoImpressao.module.css";

export interface ItemPlano {
  id: string;
  nome: string;
  minutos: number;
  quantidade?: number;
  pesoGramas?: number;
  margemPercentual?: number;
  inicio?: string;
}

/** Piso de lucro e cupom de loja da configuração — a estratégia de cupons da Shopee usa os mesmos da calculadora. */
export interface ReguaDesconto {
  pisoPercentual: number;
  cupomLoja: CupomLoja | null;
}

export interface PlanoProduto {
  /** Chave na tela: o id do plano, ou um provisório enquanto `novo`. */
  chave: string;
  /** Id do plano gravado — ausente enquanto `novo`. */
  id?: string;
  /** Produto do catálogo; ausente = item avulso, que ainda não é produto. */
  produtoId?: string;
  /** Nome do produto, ou o nome do item avulso. */
  produtoNome: string;
  /** Link do modelo 3D de origem (MakerWorld, Drive…) — o nome do produto leva até ele. */
  linkModelo3d?: string;
  itens: ItemPlano[];
  /** Anúncio pago na Shopee — ausente = desligado. */
  anuncio?: { ativo: boolean; roasMeta: number };
  /** Margem do anúncio na Shopee com folga para descontos (% do preço) — ausente = sem folga. */
  margemDescontosPercentual?: number;
  /** Ainda não gravado: o primeiro "Salvar" cria o plano (POST). */
  novo?: boolean;
}

/** Linha como a tela edita: tudo texto, convertido só ao salvar. */
interface Linha {
  id: string;
  nome: string;
  horas: string;
  minutos: string;
  quantidade: string;
  /** Peso da placa inteira (g), como o fatiador mostra. */
  peso: string;
  /** Lucro em % do preço de venda; vazio = piso da loja. */
  margem: string;
  inicio: string;
}

/** Cores da marca, uma por parte — a mesma na linha e na régua do dia. */
const CORES = ["var(--roxo)", "var(--turquesa)", "var(--laranja)", "var(--rosa)", "var(--amarelo)"];
const MINUTOS_DIA = 24 * 60;

function paraLinha(item: ItemPlano): Linha {
  return {
    id: item.id,
    nome: item.nome,
    horas: String(Math.floor(item.minutos / 60)),
    minutos: String(item.minutos % 60),
    quantidade: String(quantidadeDoItem(item)),
    peso: item.pesoGramas !== undefined ? String(item.pesoGramas) : "",
    margem: item.margemPercentual !== undefined ? String(item.margemPercentual) : "",
    inicio: item.inicio ?? "",
  };
}

function minutosDaLinha(linha: Linha): number {
  const horas = Number(linha.horas.replace(",", ".") || 0);
  const minutos = Number(linha.minutos || 0);
  if (!Number.isFinite(horas) || !Number.isFinite(minutos)) return NaN;
  return Math.round(horas * 60 + minutos);
}

function novaLinha(nome = ""): Linha {
  return { id: crypto.randomUUID(), nome, horas: "", minutos: "", quantidade: "1", peso: "", margem: "", inicio: "" };
}

/** Vazio = sem valor (null); texto inválido vai como está para o servidor recusar com a mensagem. */
function numeroOpcional(texto: string): number | string | null {
  const limpo = texto.trim().replace(",", ".");
  if (limpo === "") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : texto;
}

/** Margem vazia = piso de lucro da loja (a meta mínima, 25% por padrão). */
function placaDaLinha(linha: Linha, margemPadrao: number): PlacaGanho {
  const margem = linha.margem.trim().replace(",", ".");
  return {
    minutos: minutosDaLinha(linha),
    quantidade: Number(linha.quantidade),
    pesoGramas: Number(linha.peso.trim().replace(",", ".") || NaN),
    margemPercentual: margem === "" ? margemPadrao : Number(margem),
  };
}

function percentual(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function reais(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

function gramas(valor: number): string {
  return valor >= 1000
    ? `${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`
    : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g`;
}

/** Custo, preço e ganho de verdade em cada canal; a Shopee abre a estratégia de cupons. */
function ResumoGanho({
  ganho,
  rotulo,
  regua,
  idCampo,
}: {
  ganho: Ganho;
  rotulo: string;
  regua: ReguaDesconto;
  idCampo: string;
}) {
  const [cupons, setCupons] = useState(false);
  const shopee = ganho.canais.shopee;
  const lucroShopee = shopee ? (preco: number) => lucroNoPreco(shopee, preco) : null;
  const verba =
    shopee && shopee.precoCentavos !== null && lucroShopee
      ? calcularVerbaDesconto({
          precoCentavos: shopee.precoCentavos,
          // Com folga, os descontos param no "quero ganhar" da peça; sem folga, no piso da loja.
          pisoPercentual: ganho.margemDescontosPercentual !== null ? ganho.margemPercentual : regua.pisoPercentual,
          cupomLoja: regua.cupomLoja,
          lucroEm: lucroShopee,
        })
      : null;
  const canais = [
    ["Shopee", shopee],
    ["Venda direta", ganho.canais.direta],
  ] as const;
  const abaixoDoPiso = ganho.margemPercentual < regua.pisoPercentual - 0.005;

  return (
    <div className={styles.ganho}>
      <span className={styles.ganhoRotulo}>{rotulo}</span>
      <span>
        Custo <strong className={styles.totalValor}>{reais(ganho.custoCentavos)}</strong>
      </span>
      {canais.map(([nome, canal]) => (
        <span key={nome}>
          {nome}{" "}
          {canal && canal.precoCentavos !== null && canal.lucroCentavos !== null ? (
            <>
              <strong className={styles.totalValor}>{reais(canal.precoCentavos)}</strong> · você ganha{" "}
              <strong className={styles.ganhoLucro}>{reais(canal.lucroCentavos)}</strong> (
              {percentual((canal.lucroCentavos / canal.precoCentavos) * 100)})
              {canal.anuncioCentavos !== null && canal.anuncioCentavos > 0 && <> · anúncio {reais(canal.anuncioCentavos)}</>}
            </>
          ) : (
            "sem preço possível: taxas, anúncio e margem passam de 100% do preço"
          )}
        </span>
      ))}
      {abaixoDoPiso && (
        <span className={styles.ganhoAviso}>
          Margem de {percentual(ganho.margemPercentual)}, abaixo da meta mínima de {percentual(regua.pisoPercentual)}.
        </span>
      )}
      {verba && lucroShopee && (
        <button
          type="button"
          className={styles.botaoTexto}
          onClick={() => setCupons((atual) => !atual)}
          aria-expanded={cupons}
        >
          {cupons ? "Esconder cupons" : "Cupons da Shopee"}
        </button>
      )}
      {cupons && verba && lucroShopee && (
        <div className={styles.ganhoCupons}>
          <VerbaDesconto verba={verba} lucroEm={lucroShopee} idCampo={idCampo} />
        </div>
      )}
    </div>
  );
}

function textoTermino(inicio: string, minutos: number): React.ReactNode {
  const termino = inicio ? terminoPrevisto(inicio, minutos) : null;
  if (!termino) return "—";
  return (
    <>
      → termina <strong className={styles.terminoValor}>{termino.horario}</strong>
      {termino.diasDepois === 1 && " (dia seguinte)"}
      {termino.diasDepois > 1 && ` (+${termino.diasDepois} dias)`}
    </>
  );
}

/** Faixas da régua: do início ao término, dando a volta na meia-noite. */
function faixas(linhas: Linha[]): { chave: string; cor: string; esquerda: number; largura: number }[] {
  return linhas.flatMap((linha, indice) => {
    const minutos = minutosDaLinha(linha);
    const [h, m] = linha.inicio.split(":").map(Number);
    if (!linha.inicio || !(minutos > 0) || !Number.isInteger(h) || !Number.isInteger(m)) return [];
    const cor = CORES[indice % CORES.length];
    const comeco = h * 60 + m;
    if (minutos >= MINUTOS_DIA) return [{ chave: linha.id, cor, esquerda: 0, largura: 100 }];

    const fim = comeco + minutos;
    const pct = (valor: number) => (valor / MINUTOS_DIA) * 100;
    if (fim <= MINUTOS_DIA) return [{ chave: linha.id, cor, esquerda: pct(comeco), largura: pct(minutos) }];
    return [
      { chave: `${linha.id}-a`, cor, esquerda: pct(comeco), largura: pct(MINUTOS_DIA - comeco) },
      { chave: `${linha.id}-b`, cor, esquerda: 0, largura: pct(fim - MINUTOS_DIA) },
    ];
  });
}

export default function PlanoProdutoCard({
  plano,
  regua,
  destaque,
  aberto,
  oculto,
  paraKit,
  onAlternar,
  onAlternarKit,
  onClonar,
  onSalvo,
  onRemovido,
}: {
  plano: PlanoProduto;
  regua: ReguaDesconto;
  destaque: boolean;
  /** Recolhido = só o cabeçalho (nome e totais), para achar o produto rápido. */
  aberto: boolean;
  /** Fora da busca: escondido, mas montado — edições não salvas não se perdem. */
  oculto: boolean;
  /** Marcado para ir ao montador de kits. */
  paraKit: boolean;
  onAlternar: () => void;
  onAlternarKit: () => void;
  /** Cria uma cópia avulsa com todas as partes, para ajustar uma ou outra. */
  onClonar: () => void;
  onSalvo: (plano: PlanoProduto) => void;
  onRemovido: (chave: string) => void;
}) {
  const inicial = useMemo(
    () => (plano.itens.length > 0 ? plano.itens.map(paraLinha) : [novaLinha(plano.produtoNome)]),
    [plano]
  );
  const avulso = !plano.produtoId;
  const [linhas, setLinhas] = useState<Linha[]>(inicial);
  /** Nome do item avulso (o do produto vem do catálogo e não muda aqui). */
  const [nome, setNome] = useState(plano.produtoNome);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [anuncioAtivo, setAnuncioAtivo] = useState(plano.anuncio?.ativo ?? false);
  const [roas, setRoas] = useState(String(plano.anuncio?.roasMeta ?? ROAS_PADRAO));

  const roasNumero = Number(roas.trim().replace(",", "."));
  const roasOk = Number.isFinite(roasNumero) && roasNumero > 0 && roasNumero <= ROAS_MAXIMO;
  const anuncioPercentual = percentualDoAnuncio({ ativo: anuncioAtivo, roasMeta: roasNumero });
  const anuncioAlterado =
    anuncioAtivo !== (plano.anuncio?.ativo ?? false) ||
    (anuncioAtivo && roasNumero !== (plano.anuncio?.roasMeta ?? ROAS_PADRAO));
  const margemPadrao = regua.pisoPercentual;
  const [folgaTexto, setFolgaTexto] = useState(
    plano.margemDescontosPercentual !== undefined ? String(plano.margemDescontosPercentual) : ""
  );
  const folgaNumero = Number(folgaTexto.trim().replace(",", "."));
  const folgaValida = folgaTexto.trim() !== "" && Number.isFinite(folgaNumero) && folgaNumero >= 0 && folgaNumero < 100;
  const folga = folgaValida ? folgaNumero : null;
  const folgaAlterada = folgaTexto.trim() !== (plano.margemDescontosPercentual !== undefined ? String(plano.margemDescontosPercentual) : "");

  const alterado =
    plano.novo ||
    JSON.stringify(linhas) !== JSON.stringify(inicial) ||
    (avulso && nome !== plano.produtoNome) ||
    anuncioAlterado ||
    folgaAlterada;
  const pecas = linhas.reduce((soma, linha) => soma + (Number(linha.quantidade) > 0 ? Number(linha.quantidade) : 0), 0);
  const total = linhas.reduce((soma, linha) => soma + (minutosDaLinha(linha) > 0 ? minutosDaLinha(linha) : 0), 0);
  const peso = linhas.reduce((soma, linha) => {
    const valor = Number(linha.peso.trim().replace(",", "."));
    return soma + (valor > 0 ? valor : 0);
  }, 0);
  const conjunto =
    linhas.length > 1
      ? ganhoDoConjunto(linhas.map((linha) => placaDaLinha(linha, margemPadrao)), anuncioPercentual, folga)
      : null;

  function atualizar(id: string, campo: keyof Linha, valor: string) {
    setLinhas((atual) => atual.map((linha) => (linha.id === id ? { ...linha, [campo]: valor } : linha)));
    setAviso(null);
  }

  function alternarSelecao(id: string) {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  function removerSelecionadas() {
    setLinhas((atual) => atual.filter((linha) => !selecionadas.has(linha.id)));
    setSelecionadas(new Set());
    setAviso(null);
  }

  /**
   * Ligado vai como está (ROAS inválido volta 400 com a mensagem); desligado
   * guarda o ROAS válido para religar depois, ou remove o anúncio.
   */
  function corpoAnuncio() {
    if (anuncioAtivo) return { ativo: true, roasMeta: roasOk ? roasNumero : roas };
    return roasOk ? { ativo: false, roasMeta: roasNumero } : null;
  }

  async function salvar() {
    setEnviando(true);
    setErro(null);
    setAviso(null);
    const itens = linhas.map((linha) => ({
      id: linha.id,
      nome: linha.nome,
      minutos: minutosDaLinha(linha),
      quantidade: Number(linha.quantidade),
      pesoGramas: numeroOpcional(linha.peso),
      margemPercentual: numeroOpcional(linha.margem),
      inicio: linha.inicio,
    }));

    try {
      const origem = avulso ? { nome } : plano.novo ? { produtoId: plano.produtoId } : {};
      const resposta = await fetch(
        plano.novo ? "/api/admin/tempo-impressao" : `/api/admin/tempo-impressao/${plano.id}`,
        {
          method: plano.novo ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...origem,
            itens,
            anuncio: corpoAnuncio(),
            // Texto inválido vai como está para o servidor recusar com a mensagem.
            margemDescontosPercentual: folgaTexto.trim() === "" ? null : folgaValida ? folgaNumero : folgaTexto,
          }),
        }
      );
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(dados.erro ?? `Falha ao salvar (HTTP ${resposta.status}).`);
        return;
      }
      const salvo: PlanoProduto = {
        chave: plano.chave,
        id: String(dados.plano._id),
        produtoId: plano.produtoId,
        produtoNome: avulso ? dados.plano.nome : plano.produtoNome,
        linkModelo3d: plano.linkModelo3d,
        itens: dados.plano.itens,
        ...(dados.plano.anuncio ? { anuncio: dados.plano.anuncio } : {}),
        ...(typeof dados.plano.margemDescontosPercentual === "number"
          ? { margemDescontosPercentual: dados.plano.margemDescontosPercentual }
          : {}),
      };
      setLinhas(salvo.itens.map(paraLinha));
      setNome(salvo.produtoNome);
      setAviso("Tempos salvos.");
      onSalvo(salvo);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  async function removerDoMenu() {
    const nota = avulso ? "" : " O produto continua no catálogo.";
    if (!window.confirm(`Tirar "${plano.produtoNome}" do Tempo de Impressão?${nota}`)) {
      return;
    }
    if (plano.novo) {
      onRemovido(plano.chave);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/admin/tempo-impressao/${plano.id}`, { method: "DELETE" });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        setErro(dados.erro ?? `Falha ao remover (HTTP ${resposta.status}).`);
        return;
      }
      onRemovido(plano.chave);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao remover.");
    } finally {
      setEnviando(false);
    }
  }

  const faixasDoDia = faixas(linhas);
  /** Calculadora e cadastro leem o que está gravado: com alteração pendente, salvar antes. */
  const podeSair = !plano.novo && !alterado;
  const tituloSair = podeSair ? undefined : "Salve antes para levar os tempos atualizados.";
  const linkCalculadora = avulso
    ? `/admin/produtos/calculadora?planoImpressao=${plano.id}`
    : `/admin/produtos/calculadora?produto=${plano.produtoId}`;
  const linkProduto = avulso ? `/admin/produtos/novo?planoImpressao=${plano.id}` : `/admin/produtos/${plano.produtoId}/editar`;

  function acaoSaida(href: string, rotulo: string) {
    return podeSair ? (
      <Link href={href} className={`${styles.botao} ${styles.botaoSecundario}`}>
        {rotulo}
      </Link>
    ) : (
      <button type="button" className={`${styles.botao} ${styles.botaoSecundario}`} disabled title={tituloSair}>
        {rotulo}
      </button>
    );
  }

  return (
    <article
      id={`plano-${plano.chave}`}
      className={`${styles.produto} ${destaque ? styles.produtoDestaque : ""}`}
      hidden={oculto}
    >
      <div className={styles.produtoTopo}>
        <button
          type="button"
          className={styles.alternar}
          onClick={onAlternar}
          aria-expanded={aberto}
          aria-controls={`corpo-${plano.chave}`}
          title={aberto ? "Recolher as partes" : "Mostrar as partes"}
        >
          <span className={`${styles.seta} ${aberto ? styles.setaAberta : ""}`} aria-hidden="true">
            ▸
          </span>
          <span className={styles.somenteLeitor}>{aberto ? "Recolher" : "Mostrar"} partes</span>
        </button>
        <label
          className={styles.selecionarKit}
          title={plano.novo ? "Salve antes para enviar ao kit." : "Enviar 1 peça deste item para um kit novo"}
        >
          <input type="checkbox" checked={paraKit} onChange={onAlternarKit} disabled={plano.novo} />
          Kit
        </label>
        <h2 className={styles.produtoNome}>
          {avulso ? (
            <input
              className={`${styles.entrada} ${styles.entradaNome}`}
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setAviso(null);
              }}
              placeholder="Nome do item"
              aria-label="Nome do item"
            />
          ) : plano.linkModelo3d ? (
            <a
              href={plano.linkModelo3d}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkModelo}
              title="Abrir o modelo 3D de origem"
            >
              {plano.produtoNome}
            </a>
          ) : (
            plano.produtoNome
          )}
        </h2>
        <span className={styles.total}>
          Total: <span className={styles.totalValor}>{minutosEmHoras(total)}</span>
          {linhas.length > 1 && ` em ${linhas.length} partes`}
          {" · "}
          <span className={styles.totalValor}>{pecas}</span> {pecas === 1 ? "peça" : "peças"}
          {peso > 0 && (
            <>
              {" · "}
              <span className={styles.totalValor}>{gramas(peso)}</span> de filamento
            </>
          )}
        </span>
        {avulso && <span className={styles.seloAvulso}>ainda não é produto</span>}
        {alterado && <span className={styles.naoSalvo}>não salvo</span>}
      </div>

      <div className={styles.anuncio}>
        <label className={styles.anuncioInterruptor}>
          <input
            type="checkbox"
            role="switch"
            checked={anuncioAtivo}
            onChange={(e) => {
              setAnuncioAtivo(e.target.checked);
              setAviso(null);
            }}
          />
          Anúncio pago na Shopee
        </label>
        {anuncioAtivo ? (
          <label className={styles.anuncioRoas}>
            ROAS meta
            <input
              className={`${styles.entrada} ${styles.entradaNumero}`}
              value={roas}
              onChange={(e) => {
                setRoas(e.target.value);
                setAviso(null);
              }}
              inputMode="decimal"
              placeholder={String(ROAS_PADRAO)}
              aria-invalid={!roasOk}
              title="R$ vendidos a cada R$ 1 de anúncio"
            />
            <span className={roasOk ? styles.anuncioApoio : styles.anuncioErro}>
              {roasOk
                ? `${percentual(anuncioPercentual)} do preço vai para o anúncio`
                : `Informe um ROAS maior que 0 e até ${ROAS_MAXIMO}.`}
            </span>
          </label>
        ) : (
          <span className={styles.anuncioApoio}>Desligado: o preço não reserva nada para anúncio.</span>
        )}
      </div>

      <div className={styles.anuncio}>
        <label className={styles.anuncioRoas}>
          Margem do anúncio na Shopee (com folga)
          <input
            className={`${styles.entrada} ${styles.entradaNumero}`}
            value={folgaTexto}
            onChange={(e) => {
              setFolgaTexto(e.target.value);
              setAviso(null);
            }}
            inputMode="decimal"
            placeholder={String(Math.min(99, margemPadrao + 15))}
            aria-invalid={folgaTexto.trim() !== "" && !folgaValida}
            title="% do preço. O preço sobe para pagar cupom de loja + desconto ou oferta relâmpago e ainda sobrar a margem de cada parte."
          />
          %
        </label>
        <span className={folgaTexto.trim() !== "" && !folgaValida ? styles.anuncioErro : styles.anuncioApoio}>
          {folgaTexto.trim() === ""
            ? "Vazio = sem folga: o preço da Shopee usa a margem de cada parte."
            : !folgaValida
              ? "Use um valor de 0 a 99,9% do preço."
              : "Os descontos param na margem de cada parte. Desconto do produto e oferta relâmpago podem usar o mesmo %: não se somam entre si."}
        </span>
      </div>

      {conjunto && (
        <ResumoGanho
          ganho={conjunto}
          rotulo="Conjunto (1 de cada parte)"
          regua={regua}
          idCampo={`cupom-${plano.chave}`}
        />
      )}

      <div id={`corpo-${plano.chave}`} hidden={!aberto}>
      <div className={styles.linhas}>
        <div className={styles.cabecalho} aria-hidden="true">
          <span />
          <span>Parte</span>
          <span>Horas</span>
          <span>Min</span>
          <span>Qtd</span>
          <span>Peso (g)</span>
          <span title="Lucro em % do preço de venda">Margem % preço</span>
          <span>Início</span>
          <span>Término</span>
        </div>
        {linhas.map((linha, indice) => {
          const ganho = ganhoDaPlaca(placaDaLinha(linha, margemPadrao), anuncioPercentual, folga);
          return (
          <Fragment key={linha.id}>
          <div className={styles.linha}>
            <span>
              <input
                type="checkbox"
                checked={selecionadas.has(linha.id)}
                onChange={() => alternarSelecao(linha.id)}
                aria-label={`Selecionar ${linha.nome || "parte"}`}
              />
              <span className={styles.cor} style={{ background: CORES[indice % CORES.length] }} />
            </span>
            <input
              className={styles.entrada}
              value={linha.nome}
              onChange={(e) => atualizar(linha.id, "nome", e.target.value)}
              placeholder="Nome da parte ou produto inteiro"
              aria-label="Nome da parte"
            />
            <label className={styles.campo}>
              <span className={styles.campoRotulo} aria-hidden="true">Horas</span>
              <input
                className={`${styles.entrada} ${styles.entradaNumero}`}
                value={linha.horas}
                onChange={(e) => atualizar(linha.id, "horas", e.target.value)}
                inputMode="numeric"
                placeholder="0"
                aria-label="Horas de impressão"
              />
            </label>
            <label className={styles.campo}>
              <span className={styles.campoRotulo} aria-hidden="true">Min</span>
              <input
                className={`${styles.entrada} ${styles.entradaNumero}`}
                value={linha.minutos}
                onChange={(e) => atualizar(linha.id, "minutos", e.target.value)}
                inputMode="numeric"
                placeholder="0"
                aria-label="Minutos de impressão"
              />
            </label>
            <label className={styles.campo}>
              <span className={styles.campoRotulo} aria-hidden="true">Qtd</span>
              <input
                className={`${styles.entrada} ${styles.entradaNumero}`}
                value={linha.quantidade}
                onChange={(e) => atualizar(linha.id, "quantidade", e.target.value)}
                inputMode="numeric"
                placeholder="1"
                aria-label="Peças nesta placa"
                title="Quantas peças saem nesta impressão"
              />
            </label>
            <label className={styles.campo}>
              <span className={styles.campoRotulo} aria-hidden="true">Peso (g)</span>
              <input
                className={`${styles.entrada} ${styles.entradaNumero}`}
                value={linha.peso}
                onChange={(e) => atualizar(linha.id, "peso", e.target.value)}
                inputMode="decimal"
                placeholder="0"
                aria-label="Peso da placa em gramas"
                title="Peso da impressão toda, como o fatiador mostra"
              />
            </label>
            <label className={styles.campo}>
              <span className={styles.campoRotulo} aria-hidden="true">Margem % preço</span>
              <input
                className={`${styles.entrada} ${styles.entradaNumero}`}
                value={linha.margem}
                onChange={(e) => atualizar(linha.id, "margem", e.target.value)}
                inputMode="decimal"
                placeholder={String(margemPadrao)}
                aria-label="Margem de lucro em % do preço de venda"
                title={`Quanto sobra do preço depois de custo, taxas e anúncio. Vazio = ${margemPadrao}% (meta mínima).`}
              />
            </label>
            <label className={styles.campo}>
              <span className={styles.campoRotulo} aria-hidden="true">Início</span>
              <input
                type="time"
                className={styles.entrada}
                value={linha.inicio}
                onChange={(e) => atualizar(linha.id, "inicio", e.target.value)}
                aria-label="Horário de início"
              />
            </label>
            <span className={styles.termino}>{textoTermino(linha.inicio, minutosDaLinha(linha))}</span>
          </div>
          {ganho && (
            <ResumoGanho ganho={ganho} rotulo="1 peça" regua={regua} idCampo={`cupom-${plano.chave}-${linha.id}`} />
          )}
          </Fragment>
          );
        })}
      </div>

      {faixasDoDia.length > 0 && (
        <div className={styles.regua} aria-label="Régua do dia: faixa de cada parte entre início e término">
          <div className={styles.reguaTrilho}>
            {faixasDoDia.map((faixa) => (
              <span
                key={faixa.chave}
                className={styles.reguaFaixa}
                style={{ left: `${faixa.esquerda}%`, width: `${faixa.largura}%`, background: faixa.cor }}
              />
            ))}
          </div>
          <div className={styles.reguaMarcas} aria-hidden="true">
            {[0, 6, 12, 18, 24].map((hora) => (
              <span key={hora} style={{ left: `${(hora / 24) * 100}%` }}>
                {String(hora).padStart(2, "0")}h
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.acoes}>
        <button
          type="button"
          className={styles.botaoTexto}
          onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
          disabled={enviando}
        >
          Adicionar parte
        </button>
        <button
          type="button"
          className={styles.botaoTexto}
          onClick={removerSelecionadas}
          disabled={enviando || selecionadas.size === 0}
        >
          Remover selecionadas{selecionadas.size > 0 ? ` (${selecionadas.size})` : ""}
        </button>
        <div className={styles.acoesDireita}>
          {acaoSaida(linkCalculadora, "Calculadora de preço")}
          {acaoSaida(linkProduto, avulso ? "Criar produto" : "Abrir produto")}
          <button
            type="button"
            className={`${styles.botao} ${styles.botaoSecundario}`}
            onClick={onClonar}
            disabled={enviando || !podeSair}
            title={podeSair ? "Cria uma cópia com todas as partes, como item avulso" : "Salve antes para clonar."}
          >
            Clonar
          </button>
          <button
            type="button"
            className={`${styles.botao} ${styles.botaoSecundario}`}
            onClick={removerDoMenu}
            disabled={enviando}
          >
            Remover do menu
          </button>
          <button type="button" className={styles.botao} onClick={salvar} disabled={enviando || !alterado}>
            Salvar
          </button>
        </div>
      </div>

      </div>

      {aviso && <p className={styles.ok}>{aviso}</p>}
      {erro && <p className={styles.erro}>{erro}</p>}
    </article>
  );
}
