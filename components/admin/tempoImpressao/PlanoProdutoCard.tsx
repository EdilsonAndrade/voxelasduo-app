"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { terminoPrevisto } from "@/lib/producao/agenda";
import { minutosEmHoras, quantidadeDoItem } from "@/lib/producao/planosImpressao";
import styles from "./tempoImpressao.module.css";

export interface ItemPlano {
  id: string;
  nome: string;
  minutos: number;
  quantidade?: number;
  inicio?: string;
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
  return { id: crypto.randomUUID(), nome, horas: "", minutos: "", quantidade: "1", inicio: "" };
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
  destaque,
  aberto,
  oculto,
  onAlternar,
  onSalvo,
  onRemovido,
}: {
  plano: PlanoProduto;
  destaque: boolean;
  /** Recolhido = só o cabeçalho (nome e totais), para achar o produto rápido. */
  aberto: boolean;
  /** Fora da busca: escondido, mas montado — edições não salvas não se perdem. */
  oculto: boolean;
  onAlternar: () => void;
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

  const alterado =
    plano.novo || JSON.stringify(linhas) !== JSON.stringify(inicial) || (avulso && nome !== plano.produtoNome);
  const pecas = linhas.reduce((soma, linha) => soma + (Number(linha.quantidade) > 0 ? Number(linha.quantidade) : 0), 0);
  const total = linhas.reduce((soma, linha) => soma + (minutosDaLinha(linha) > 0 ? minutosDaLinha(linha) : 0), 0);

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

  async function salvar() {
    setEnviando(true);
    setErro(null);
    setAviso(null);
    const itens = linhas.map((linha) => ({
      id: linha.id,
      nome: linha.nome,
      minutos: minutosDaLinha(linha),
      quantidade: Number(linha.quantidade),
      inicio: linha.inicio,
    }));

    try {
      const origem = avulso ? { nome } : plano.novo ? { produtoId: plano.produtoId } : {};
      const resposta = await fetch(
        plano.novo ? "/api/admin/tempo-impressao" : `/api/admin/tempo-impressao/${plano.id}`,
        {
          method: plano.novo ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...origem, itens }),
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
        </span>
        {avulso && <span className={styles.seloAvulso}>ainda não é produto</span>}
        {alterado && <span className={styles.naoSalvo}>não salvo</span>}
      </div>

      <div id={`corpo-${plano.chave}`} hidden={!aberto}>
      <div className={styles.linhas}>
        <div className={styles.cabecalho} aria-hidden="true">
          <span />
          <span>Parte</span>
          <span>Horas</span>
          <span>Min</span>
          <span>Qtd</span>
          <span>Início</span>
          <span>Término</span>
        </div>
        {linhas.map((linha, indice) => (
          <div key={linha.id} className={styles.linha}>
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
            <input
              className={`${styles.entrada} ${styles.entradaNumero}`}
              value={linha.horas}
              onChange={(e) => atualizar(linha.id, "horas", e.target.value)}
              inputMode="numeric"
              placeholder="0"
              aria-label="Horas de impressão"
            />
            <input
              className={`${styles.entrada} ${styles.entradaNumero}`}
              value={linha.minutos}
              onChange={(e) => atualizar(linha.id, "minutos", e.target.value)}
              inputMode="numeric"
              placeholder="0"
              aria-label="Minutos de impressão"
            />
            <input
              className={`${styles.entrada} ${styles.entradaNumero}`}
              value={linha.quantidade}
              onChange={(e) => atualizar(linha.id, "quantidade", e.target.value)}
              inputMode="numeric"
              placeholder="1"
              aria-label="Peças nesta placa"
              title="Quantas peças saem nesta impressão"
            />
            <input
              type="time"
              className={styles.entrada}
              value={linha.inicio}
              onChange={(e) => atualizar(linha.id, "inicio", e.target.value)}
              aria-label="Horário de início"
            />
            <span className={styles.termino}>{textoTermino(linha.inicio, minutosDaLinha(linha))}</span>
          </div>
        ))}
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
