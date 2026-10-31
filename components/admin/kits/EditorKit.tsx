"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import SelectBusca from "@/components/admin/SelectBusca";
import styles from "@/components/admin/admin.module.css";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import { FAIXAS_DESCONTO_PADRAO, MAXIMO_ITENS_KIT, MAXIMO_MARGEM_ITEM_KIT, type ValoresComponente } from "@/lib/models/kit";
import { custoProducaoItemNovo, custoSemEmbalagem } from "@/lib/kits/componentes";
import type { CampoDesatualizado, Desatualizacao } from "@/lib/kits/desatualizacao";
import {
  avaliarPreco,
  calcularTotaisKit,
  canaisDoKit,
  margensNoPreco,
  precoSugeridoItemNovo,
  sugerirFaixas,
  valorDoItem,
  type AvaliacaoPreco,
  type MargemCanal,
} from "@/lib/kits/precificacaoKit";
import type { KitDetalhe } from "@/lib/kits/repository";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { formatarPreco } from "@/lib/produtos/formato";
import k from "./kits.module.css";

export interface OpcaoProdutoKit {
  id: string;
  nome: string;
  valores: ValoresComponente;
  /** Produto gerado por um kit — não pode ser componente. */
  deKit: boolean;
}

/** Item que já chega no kit novo — vindo do Tempo de Impressão. */
export interface ItemInicialKit {
  /** Ausente = item novo, vira produto rascunho ao salvar. */
  produtoId?: string;
  valores: ValoresComponente;
  margemPercentual: number | null;
}

interface LinhaKit {
  chave: string;
  /** Ausente = item novo, vira produto rascunho ao salvar. */
  produtoId?: string;
  quantidade: number;
  /** Ganho em % sobre o custo, como digitado — vazio = preço avulso. */
  margem: string;
  valores: ValoresComponente;
  removido: boolean;
}

/** Máximo da régua de margem, em % do preço. */
const REGUA_MAXIMO = 60;

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

function numero(texto: string): number {
  return Number(texto.trim().replace(",", "."));
}

function centavosDeReais(texto: string): number | null {
  if (texto.trim() === "") return null;
  const n = numero(texto);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Vazio = sem margem (vale o preço avulso); `NaN` = texto inválido. */
function margemDaLinha(linha: Pick<LinhaKit, "margem">): number | null {
  if (linha.margem.trim() === "") return null;
  const n = numero(linha.margem);
  return Number.isFinite(n) && n >= 0 && n <= MAXIMO_MARGEM_ITEM_KIT ? n : NaN;
}

function formatarPeso(gramas: number): string {
  return gramas >= 1000
    ? `${(gramas / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`
    : `${gramas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g`;
}

function formatarTempo(minutos: number): string {
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`;
}

function formatarPercentual(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}

const ROTULO_MUDANCA: Record<CampoDesatualizado, string> = {
  preco: "preço",
  peso: "peso",
  tempo: "tempo de impressão",
  custo: "custo",
  quantidade: "quantidade",
  margem: "margem",
  removido: "produto apagado",
  incluido: "item incluído",
  retirado: "item retirado",
};

function descreverMudanca(m: Desatualizacao): string {
  const valor = (v: number | null) =>
    v === null
      ? "não informado"
      : m.campo === "preco" || m.campo === "custo"
        ? formatarPreco(v)
        : m.campo === "peso"
          ? formatarPeso(v)
          : m.campo === "tempo"
            ? formatarTempo(v)
            : m.campo === "margem"
              ? `${v.toLocaleString("pt-BR")}%`
              : String(v);
  if (m.campo === "removido" || m.campo === "incluido" || m.campo === "retirado") {
    return `${m.nome}: ${ROTULO_MUDANCA[m.campo]}`;
  }
  return `${m.nome}: ${ROTULO_MUDANCA[m.campo]} de ${valor(m.antes)} para ${valor(m.depois)}`;
}

function linhasDoDetalhe(kit: KitDetalhe): LinhaKit[] {
  return kit.itens.map((item) => ({
    chave: item.produtoId,
    produtoId: item.produtoId,
    quantidade: item.quantidade,
    margem: item.margemPercentual !== undefined ? String(item.margemPercentual) : "",
    valores: item.atual,
    removido: item.removido,
  }));
}

function linhasDoTempoImpressao(itens: ItemInicialKit[]): LinhaKit[] {
  return itens.map((item) => ({
    chave: item.produtoId ?? `novo-${crypto.randomUUID()}`,
    produtoId: item.produtoId,
    quantidade: 1,
    // Sem custo cadastrado a margem não tem base: vale o preço avulso.
    margem: item.margemPercentual !== null && item.valores.custoCentavos !== null ? String(item.margemPercentual) : "",
    valores: item.valores,
    removido: false,
  }));
}

/** Régua de margem de um canal: barra até a margem, traço no piso. */
function Regua({ margem, piso }: { margem: MargemCanal; piso: number }) {
  const largura = Math.max(0, Math.min(margem.margemPercentual, REGUA_MAXIMO)) / REGUA_MAXIMO;
  return (
    <div className={k.regua}>
      <span>{margem.rotulo}</span>
      <span
        className={k.reguaTrilho}
        role="img"
        aria-label={`${margem.rotulo}: margem de ${formatarPercentual(margem.margemPercentual)}, piso de ${formatarPercentual(piso)}`}
      >
        <span
          className={`${k.reguaBarra} ${margem.abaixoDoPiso ? k.reguaBarraBaixa : ""}`}
          style={{ width: `${largura * 100}%` }}
        />
        <span className={k.reguaPiso} style={{ left: `${(Math.min(piso, REGUA_MAXIMO) / REGUA_MAXIMO) * 100}%` }} />
      </span>
      <span className={k.reguaValor}>{formatarPercentual(margem.margemPercentual)}</span>
    </div>
  );
}

function Reguas({ avaliacao, piso }: { avaliacao: AvaliacaoPreco; piso: number }) {
  return (
    <>
      {avaliacao.margens.map((m) => (
        <Regua key={m.canal} margem={m} piso={piso} />
      ))}
    </>
  );
}

/**
 * Montador de kits (specs/037): produtos do catálogo e itens novos, totalizador
 * ao vivo e sugestão de preço por faixas de desconto sobre a soma dos valores
 * dos itens (preço avulso, ou custo + margem do item), com a margem de cada
 * canal contra o piso de lucro da loja.
 */
export default function EditorKit({
  kitInicial,
  doTempoImpressao,
  produtos,
  taxasGlobais,
  embalagemPadraoCentavos,
}: {
  kitInicial: KitDetalhe | null;
  /** Kit novo com os itens enviados pelo Tempo de Impressão e o que ficou de fora. */
  doTempoImpressao?: { itens: ItemInicialKit[]; ignorados: string[] };
  produtos: OpcaoProdutoKit[];
  taxasGlobais: TaxasCanaisConfig;
  embalagemPadraoCentavos: number;
}) {
  const router = useRouter();
  const [kitId, setKitId] = useState(kitInicial?.id ?? null);
  const [produtoDoKitId, setProdutoDoKitId] = useState(kitInicial?.produtoId ?? null);
  const [nome, setNome] = useState(kitInicial?.nome ?? "");
  const [embalagemReais, setEmbalagemReais] = useState(
    ((kitInicial?.embalagemCentavos ?? embalagemPadraoCentavos) / 100).toFixed(2)
  );
  const [faixasTexto, setFaixasTexto] = useState<string[]>(
    (kitInicial?.faixasDesconto ?? FAIXAS_DESCONTO_PADRAO).map(String)
  );
  const [linhas, setLinhas] = useState<LinhaKit[]>(() =>
    kitInicial ? linhasDoDetalhe(kitInicial) : linhasDoTempoImpressao(doTempoImpressao?.itens ?? [])
  );
  const [precoCentavos, setPrecoCentavos] = useState<number | null>(kitInicial?.precoCentavos ?? null);
  const [precoProprioReais, setPrecoProprioReais] = useState("");
  const [confirmarAbaixoPiso, setConfirmarAbaixoPiso] = useState(false);
  const [desatualizacao, setDesatualizacao] = useState<Desatualizacao[]>(kitInicial?.desatualizacao ?? []);
  const [escolhido, setEscolhido] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoPeso, setNovoPeso] = useState("");
  const [novoHoras, setNovoHoras] = useState("");
  const [novoMinutos, setNovoMinutos] = useState("");
  const [novoPrecoReais, setNovoPrecoReais] = useState("");
  const [repetido, setRepetido] = useState<{ produtoExistenteId: string; nome: string; chaveNovo?: string } | null>(null);
  const [sujo, setSujo] = useState(() => !kitInicial && (doTempoImpressao?.itens.length ?? 0) > 0);
  const [salvando, setSalvando] = useState(false);
  const [gerandoProduto, setGerandoProduto] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<React.ReactNode>(null);

  const canais = useMemo(() => canaisDoKit(taxasGlobais), [taxasGlobais]);
  const piso = taxasGlobais.margemMinimaPercentual;
  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const embalagemCentavos = centavosDeReais(embalagemReais);
  const faixas = faixasTexto.map(numero).filter((f) => Number.isFinite(f) && f > 0 && f < 100);
  const totais = calcularTotaisKit(
    linhas.map((l) => ({ ...l, margemPercentual: margemDaLinha(l) })),
    embalagemCentavos ?? 0
  );
  const margemInvalida = linhas.some((l) => Number.isNaN(margemDaLinha(l)));
  const sugestoes = sugerirFaixas(totais, [...new Set(faixas)].sort((a, b) => a - b), canais, piso);
  const avaliacaoEscolhida = precoCentavos !== null && linhas.length > 0 ? avaliarPreco(precoCentavos, totais, canais, piso) : null;

  const opcoesProdutos = produtos
    .filter((p) => !p.deKit)
    .map((p) => ({ valor: p.id, rotulo: `${p.nome} · ${formatarPreco(p.valores.precoCentavos)}${linhas.some((l) => l.produtoId === p.id) ? " · no kit" : ""}` }));

  // Prévia do item novo: custo pelo padrão da loja, preço sugerido no site e margem por canal.
  const pesoNovo = numero(novoPeso);
  const minutosNovo = Math.round((numero(novoHoras || "0") || 0) * 60 + (numero(novoMinutos || "0") || 0));
  const custoNovo = custoProducaoItemNovo(pesoNovo, minutosNovo);
  const custoNovoComEmbalagem = custoNovo ? calcularCustoProducao(custoNovo).totalCentavos : null;
  const precoSugeridoNovo = custoNovoComEmbalagem !== null ? precoSugeridoItemNovo(custoNovoComEmbalagem, taxasGlobais) : null;
  const precoNovoCentavos = novoPrecoReais.trim() !== "" ? centavosDeReais(novoPrecoReais) : precoSugeridoNovo;
  const margensNovo =
    custoNovoComEmbalagem !== null && precoNovoCentavos ? margensNoPreco(precoNovoCentavos, custoNovoComEmbalagem, canais, piso) : null;

  function alterou() {
    setSujo(true);
    setSucesso(null);
  }

  function adicionarProduto() {
    const produto = porId.get(escolhido);
    if (!produto) return;
    setEscolhido("");
    alterou();
    setLinhas((atual) => {
      const existente = atual.find((l) => l.produtoId === produto.id);
      if (existente) {
        return atual.map((l) => (l === existente ? { ...l, quantidade: Math.min(l.quantidade + 1, 999) } : l));
      }
      return [...atual, { chave: produto.id, produtoId: produto.id, quantidade: 1, margem: "", valores: produto.valores, removido: false }];
    });
  }

  function adicionarItemNovo(evento: React.FormEvent) {
    evento.preventDefault();
    const nomeLimpo = novoNome.trim();
    if (!nomeLimpo || !custoNovo || !precoNovoCentavos || precoNovoCentavos <= 0) return;

    const existente = produtos.find((p) => normalizar(p.nome) === normalizar(nomeLimpo));
    if (existente) {
      setRepetido({ produtoExistenteId: existente.id, nome: existente.nome });
      return;
    }
    if (linhas.some((l) => !l.produtoId && normalizar(l.valores.nome) === normalizar(nomeLimpo))) {
      setErro(`"${nomeLimpo}" já está no kit como item novo.`);
      return;
    }

    alterou();
    setErro(null);
    setRepetido(null);
    setLinhas((atual) => [
      ...atual,
      {
        chave: `novo-${crypto.randomUUID()}`,
        quantidade: 1,
        margem: "",
        removido: false,
        valores: {
          nome: nomeLimpo,
          precoCentavos: precoNovoCentavos,
          pesoGramas: pesoNovo,
          tempoMinutos: minutosNovo,
          custoCentavos: custoSemEmbalagem(custoNovo),
        },
      },
    ]);
    setNovoNome("");
    setNovoPeso("");
    setNovoHoras("");
    setNovoMinutos("");
    setNovoPrecoReais("");
  }

  /** Troca o item novo repetido (ou o que ia ser digitado) pelo produto que já existe. */
  function usarExistente() {
    if (!repetido) return;
    const produto = porId.get(repetido.produtoExistenteId);
    setRepetido(null);
    setErro(null);
    if (!produto) return;
    if (produto.deKit) {
      setErro(`"${produto.nome}" é o produto de um kit e não pode entrar em outro kit.`);
      return;
    }
    alterou();
    setLinhas((atual) => {
      const semNovo = repetido.chaveNovo ? atual.filter((l) => l.chave !== repetido.chaveNovo) : atual;
      if (semNovo.some((l) => l.produtoId === produto.id)) return semNovo;
      return [...semNovo, { chave: produto.id, produtoId: produto.id, quantidade: 1, margem: "", valores: produto.valores, removido: false }];
    });
    setNovoNome("");
  }

  function mudarQuantidade(chave: string, texto: string) {
    const quantidade = Math.floor(numero(texto));
    if (!(quantidade >= 1 && quantidade <= 999)) return;
    alterou();
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, quantidade } : l)));
  }

  function mudarMargem(chave: string, texto: string) {
    alterou();
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, margem: texto } : l)));
  }

  function remover(chave: string) {
    alterou();
    setLinhas((atual) => atual.filter((l) => l.chave !== chave));
  }

  function escolherPreco(centavos: number) {
    alterou();
    setPrecoCentavos(centavos);
    setConfirmarAbaixoPiso(false);
  }

  function usarPrecoProprio() {
    const centavos = centavosDeReais(precoProprioReais);
    if (!centavos) {
      setErro("Informe um preço válido para o kit.");
      return;
    }
    setErro(null);
    escolherPreco(centavos);
  }

  const precoBloqueado = avaliacaoEscolhida?.bloqueada === true && !confirmarAbaixoPiso;
  const podeSalvar =
    !salvando &&
    nome.trim() !== "" &&
    embalagemCentavos !== null &&
    faixas.length > 0 &&
    !margemInvalida &&
    linhas.length <= MAXIMO_ITENS_KIT &&
    !precoBloqueado;

  async function salvar(reconfirmarPreco = false) {
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    setRepetido(null);
    try {
      const resposta = await fetch(kitId ? `/api/admin/kits/${kitId}` : "/api/admin/kits", {
        method: kitId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          embalagemCentavos: embalagemCentavos ?? 0,
          faixasDesconto: [...new Set(faixas)],
          precoCentavos: linhas.length > 0 ? precoCentavos : null,
          reconfirmarPreco,
          itens: linhas.map((l) => {
            const margem = margemDaLinha(l);
            const margemPercentual = margem === null ? {} : { margemPercentual: margem };
            return l.produtoId
              ? { produtoId: l.produtoId, quantidade: l.quantidade, ...margemPercentual }
              : {
                  quantidade: l.quantidade,
                  ...margemPercentual,
                  novo: {
                    nome: l.valores.nome,
                    pesoGramas: l.valores.pesoGramas,
                    tempoMinutos: l.valores.tempoMinutos,
                    precoCentavos: l.valores.precoCentavos,
                  },
                };
          }),
        }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        if (resposta.status === 409 && dados.produtoExistenteId) {
          const linhaNova = linhas.find((l) => !l.produtoId && normalizar(l.valores.nome) === normalizar(dados.nome ?? ""));
          setRepetido({ produtoExistenteId: dados.produtoExistenteId, nome: dados.nome, chaveNovo: linhaNova?.chave });
        }
        setErro(dados.erro ?? `Não foi possível salvar o kit (erro ${resposta.status}).`);
        return;
      }

      const kit = dados.kit as KitDetalhe;
      const criados = (dados.produtosCriados ?? []) as { id: string; nome: string }[];
      setLinhas(linhasDoDetalhe(kit));
      setPrecoCentavos(kit.precoCentavos);
      setDesatualizacao(kit.desatualizacao);
      setProdutoDoKitId(kit.produtoId ?? null);
      setSujo(false);
      setConfirmarAbaixoPiso(false);
      setSucesso(
        <>
          Kit salvo.
          {criados.length > 0 && (
            <>
              {" "}
              {criados.length === 1 ? "Produto rascunho criado: " : "Produtos rascunho criados: "}
              {criados.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ", "}
                  <Link href={`/admin/produtos/${p.id}/editar`}>{p.nome}</Link>
                </span>
              ))}
              .
            </>
          )}
        </>
      );
      if (!kitId) {
        setKitId(kit.id);
        router.replace(`/admin/kits/${kit.id}`);
      }
      router.refresh();
    } catch {
      setErro("Não foi possível salvar o kit: sem resposta do servidor.");
    } finally {
      setSalvando(false);
    }
  }

  async function gerarProduto() {
    if (!kitId) return;
    setGerandoProduto(true);
    setErro(null);
    setSucesso(null);
    try {
      const resposta = await fetch(`/api/admin/kits/${kitId}/produto`, { method: "POST" });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(dados.erro ?? `Não foi possível gerar o produto do kit (erro ${resposta.status}).`);
        return;
      }
      setProdutoDoKitId(dados.produtoId);
      if (dados.criado) {
        router.push(`/admin/produtos/${dados.produtoId}/editar`);
        return;
      }
      setSucesso(
        <>
          Produto do kit atualizado: preço, custo e itens inclusos.{" "}
          <Link href={`/admin/produtos/${dados.produtoId}/editar`}>Abrir produto</Link>
        </>
      );
    } catch {
      setErro("Não foi possível gerar o produto do kit: sem resposta do servidor.");
    } finally {
      setGerandoProduto(false);
    }
  }

  async function excluir() {
    if (!kitId) return;
    setErro(null);
    try {
      const resposta = await fetch(`/api/admin/kits/${kitId}`, { method: "DELETE" });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        setErro(dados.erro ?? `Não foi possível excluir o kit (erro ${resposta.status}).`);
        setConfirmandoExclusao(false);
        return;
      }
      router.push("/admin/kits");
      router.refresh();
    } catch {
      setErro("Não foi possível excluir o kit: sem resposta do servidor.");
    }
  }

  const salvoEPrecificado = Boolean(kitId) && !sujo && precoCentavos !== null && linhas.length > 0;
  const motivoAcoes = !kitId
    ? "Salve o kit para criar o produto ou levar para a calculadora."
    : sujo
      ? "Há alterações não salvas."
      : precoCentavos === null || linhas.length === 0
        ? "Escolha um preço para o kit e salve."
        : null;

  return (
    <div className={`container ${k.pagina}`}>
      <div className={styles.bar}>
        <h1>{kitId ? `Kit: ${nome || "sem nome"}` : "Novo kit"}</h1>
        <div className={styles.barAcoes}>
          <Link href="/admin/kits" className={styles.btnGhost}>
            Voltar aos kits
          </Link>
        </div>
      </div>

      {desatualizacao.length > 0 && !sujo && (
        <div className={k.aviso} role="status">
          <strong>Preço do kit desatualizado.</strong> Mudou desde que o preço foi definido:
          <ul>
            {desatualizacao.map((m, i) => (
              <li key={`${m.produtoId}-${m.campo}-${i}`}>{descreverMudanca(m)}</li>
            ))}
          </ul>
          Escolha uma nova faixa ou{" "}
          <button type="button" className={k.botaoLink} onClick={() => salvar(true)} disabled={salvando || !podeSalvar}>
            confirme o preço atual
          </button>
          .
        </div>
      )}
      {doTempoImpressao && doTempoImpressao.ignorados.length > 0 && (
        <div className={k.aviso} role="status">
          <strong>Ficou de fora do kit:</strong>
          <ul>
            {doTempoImpressao.ignorados.map((motivo) => (
              <li key={motivo}>{motivo}</li>
            ))}
          </ul>
        </div>
      )}
      {erro && (
        <div className={k.erro} role="alert">
          {erro}
          {repetido && (
            <>
              {" "}
              <button type="button" className={k.botaoLink} onClick={usarExistente}>
                Usar “{repetido.nome}”
              </button>
            </>
          )}
        </div>
      )}
      {!erro && repetido && (
        <div className={k.aviso} role="alert">
          Já existe um produto chamado “{repetido.nome}”.{" "}
          <button type="button" className={k.botaoLink} onClick={usarExistente}>
            Usar o produto existente
          </button>{" "}
          ou dê outro nome ao item novo.
        </div>
      )}
      {sucesso && (
        <div className={k.sucesso} role="status">
          {sucesso}
        </div>
      )}

      <div className={k.grade}>
        <div className={k.coluna}>
          <section className={k.card}>
            <div className={k.linha}>
              <label className={`${k.campo} ${k.campoNome}`}>
                <span className={k.rotulo}>Nome do kit</span>
                <input
                  className={k.input}
                  value={nome}
                  maxLength={120}
                  placeholder="Ex.: Kit Natal Mesa Posta"
                  onChange={(e) => {
                    setNome(e.target.value);
                    alterou();
                  }}
                />
              </label>
              <label className={k.campo}>
                <span className={k.rotulo}>Embalagem do kit (R$)</span>
                <input
                  className={k.input}
                  inputMode="decimal"
                  value={embalagemReais}
                  onChange={(e) => {
                    setEmbalagemReais(e.target.value);
                    alterou();
                  }}
                />
              </label>
            </div>
            {embalagemCentavos === null && <p className={k.motivo}>Informe o custo da embalagem (pode ser 0).</p>}
          </section>

          <section className={k.card}>
            <h2 className={k.cardTitulo}>Itens do kit</h2>
            <p className={k.cardSub}>
              Peso, preço e tempo vêm do cadastro de cada produto. A embalagem da peça não entra: o kit usa a embalagem dele. Com margem, o
              valor do item no kit é o custo + a margem; sem margem, vale o preço avulso.
            </p>
            <div className={k.linha}>
              <div className={`${k.campo} ${k.campoNome}`}>
                <span className={k.rotulo} id="kit-produto-rotulo">
                  Adicionar produto existente
                </span>
                <SelectBusca
                  opcoes={opcoesProdutos}
                  valor={escolhido}
                  onChange={setEscolhido}
                  placeholder="Escolha um produto"
                  placeholderBusca="Buscar pelo nome…"
                  rotuloAcessivel="Adicionar produto existente"
                  desabilitado={linhas.length >= MAXIMO_ITENS_KIT}
                />
              </div>
              <button type="button" className={styles.btnPrimary} onClick={adicionarProduto} disabled={!escolhido}>
                Adicionar
              </button>
            </div>

            {linhas.length === 0 ? (
              <p className={k.vazio}>Nenhum item ainda. Escolha um produto acima ou cadastre um item novo abaixo.</p>
            ) : (
              <div className={k.tabelaWrap}>
                <table className={k.tabela}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className={k.num}>Qtd.</th>
                      <th className={k.num}>Preço avulso</th>
                      <th className={k.num}>Peso</th>
                      <th className={k.num}>Tempo</th>
                      <th className={k.num}>Custo</th>
                      <th className={k.num}>Margem %</th>
                      <th className={k.num}>Valor no kit</th>
                      <th aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l) => (
                      <tr key={l.chave} className={l.removido ? k.removido : undefined}>
                        <td>
                          {l.produtoId && !l.removido ? (
                            <Link href={`/admin/produtos/${l.produtoId}/editar`}>{l.valores.nome}</Link>
                          ) : (
                            l.valores.nome
                          )}
                          {!l.produtoId && <span className={k.seloNovo}>novo · vira rascunho</span>}
                          {l.removido && <span className={k.seloRemovido}>produto removido</span>}
                        </td>
                        <td className={k.num}>
                          <input
                            className={k.qtd}
                            type="number"
                            min={1}
                            max={999}
                            value={l.quantidade}
                            aria-label={`Quantidade de ${l.valores.nome}`}
                            onChange={(e) => mudarQuantidade(l.chave, e.target.value)}
                          />
                        </td>
                        <td className={k.num}>{formatarPreco(l.valores.precoCentavos * l.quantidade)}</td>
                        <td className={k.num}>
                          {l.valores.pesoGramas === null ? (
                            <span className={k.faltando}>não informado</span>
                          ) : (
                            formatarPeso(l.valores.pesoGramas * l.quantidade)
                          )}
                        </td>
                        <td className={k.num}>
                          {l.valores.tempoMinutos === null ? (
                            <span className={k.faltando}>não informado</span>
                          ) : (
                            formatarTempo(l.valores.tempoMinutos * l.quantidade)
                          )}
                        </td>
                        <td className={k.num}>
                          {l.valores.custoCentavos === null ? (
                            <span className={k.faltando}>não informado</span>
                          ) : (
                            formatarPreco(l.valores.custoCentavos * l.quantidade)
                          )}
                        </td>
                        <td className={k.num}>
                          <input
                            className={`${k.qtd} ${Number.isNaN(margemDaLinha(l)) ? k.qtdInvalida : ""}`}
                            inputMode="decimal"
                            value={l.margem}
                            placeholder="—"
                            disabled={l.valores.custoCentavos === null}
                            title={
                              l.valores.custoCentavos === null
                                ? "Produto sem custo cadastrado: vale o preço avulso."
                                : "Ganho em % sobre o custo da peça. Vazio = preço avulso."
                            }
                            aria-label={`Margem de ${l.valores.nome}, em % sobre o custo`}
                            aria-invalid={Number.isNaN(margemDaLinha(l))}
                            onChange={(e) => mudarMargem(l.chave, e.target.value)}
                          />
                        </td>
                        <td className={k.num}>
                          {Number.isNaN(margemDaLinha(l)) ? (
                            <span className={k.faltando}>margem inválida</span>
                          ) : (
                            formatarPreco(valorDoItem(l.valores, margemDaLinha(l)) * l.quantidade)
                          )}
                        </td>
                        <td className={k.num}>
                          <button type="button" className={k.botaoIcone} onClick={() => remover(l.chave)} aria-label={`Remover ${l.valores.nome}`}>
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {margemInvalida && (
              <p className={k.motivo}>Margem inválida em algum item: use de 0 a {MAXIMO_MARGEM_ITEM_KIT}% ou deixe vazio.</p>
            )}
          </section>

          <form className={k.card} onSubmit={adicionarItemNovo}>
            <h2 className={k.cardTitulo}>Item novo</h2>
            <p className={k.cardSub}>
              Para uma peça que ainda não é produto. O custo usa o padrão da loja; ao salvar o kit, ela vira um produto rascunho com este preço.
            </p>
            <div className={k.linha}>
              <label className={`${k.campo} ${k.campoNome}`}>
                <span className={k.rotulo}>O que é</span>
                <input className={k.input} value={novoNome} maxLength={120} placeholder="Ex.: Rena 8 cm" onChange={(e) => setNovoNome(e.target.value)} />
              </label>
              <label className={k.campo}>
                <span className={k.rotulo}>Peso (g)</span>
                <input className={k.input} inputMode="decimal" value={novoPeso} onChange={(e) => setNovoPeso(e.target.value)} />
              </label>
              <label className={k.campo}>
                <span className={k.rotulo}>Tempo (h)</span>
                <input className={k.input} inputMode="numeric" value={novoHoras} onChange={(e) => setNovoHoras(e.target.value)} />
              </label>
              <label className={k.campo}>
                <span className={k.rotulo}>Tempo (min)</span>
                <input className={k.input} inputMode="numeric" value={novoMinutos} onChange={(e) => setNovoMinutos(e.target.value)} />
              </label>
              <label className={k.campo}>
                <span className={k.rotulo}>Preço (R$)</span>
                <input
                  className={k.input}
                  inputMode="decimal"
                  value={novoPrecoReais}
                  placeholder={precoSugeridoNovo ? (precoSugeridoNovo / 100).toFixed(2) : ""}
                  onChange={(e) => setNovoPrecoReais(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={!novoNome.trim() || !custoNovo || !precoNovoCentavos || linhas.length >= MAXIMO_ITENS_KIT}
              >
                Adicionar
              </button>
            </div>
            {custoNovoComEmbalagem !== null ? (
              <>
                <div className={k.previa}>
                  <span>
                    Custo: <strong>{formatarPreco(custoNovoComEmbalagem)}</strong> (com embalagem da peça)
                  </span>
                  <span>
                    Preço sugerido: <strong>{precoSugeridoNovo ? formatarPreco(precoSugeridoNovo) : "—"}</strong> (margem de{" "}
                    {formatarPercentual(taxasGlobais.margemDesejadaPercentual)} no site)
                  </span>
                </div>
                {margensNovo && (
                  <div className={k.faixas}>
                    {margensNovo.map((m) => (
                      <Regua key={m.canal} margem={m} piso={piso} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className={k.nota}>Informe peso e tempo para ver custo, preço sugerido e margem.</p>
            )}
          </form>
        </div>

        <aside className={k.lateral}>
          <section className={k.card} aria-live="polite">
            <h2 className={k.cardTitulo}>Totalizador</h2>
            <dl className={k.totais}>
              <div className={k.totalDestaque}>
                <dt>Soma dos valores dos itens</dt>
                <dd>{formatarPreco(totais.somaAvulsaCentavos)}</dd>
              </div>
              <div>
                <dt>Peças</dt>
                <dd>{totais.quantidadePecas}</dd>
              </div>
              <div>
                <dt>Custo do kit</dt>
                <dd>{formatarPreco(totais.custoCentavos)}</dd>
              </div>
              <div>
                <dt>Peso das peças</dt>
                <dd>{formatarPeso(totais.pesoGramas)}</dd>
              </div>
              <div>
                <dt>Tempo de impressão</dt>
                <dd>{formatarTempo(totais.tempoMinutos)}</dd>
              </div>
            </dl>
            {(totais.pesoIncompleto || totais.tempoIncompleto || totais.custoIncompleto) && (
              <p className={k.nota}>
                Incompleto: algum item está sem{" "}
                {[totais.pesoIncompleto && "peso", totais.tempoIncompleto && "tempo", totais.custoIncompleto && "custo"]
                  .filter(Boolean)
                  .join(", ")}{" "}
                no cadastro{totais.custoIncompleto ? " — a margem real é menor que a mostrada" : ""}.
              </p>
            )}
          </section>

          <section className={k.card}>
            <h2 className={k.cardTitulo}>Sugestão de preço</h2>
            <p className={k.cardSub}>
              Desconto sobre a soma dos valores dos itens. Margem em % do preço em cada canal; o traço é o piso de lucro ({formatarPercentual(piso)}). Mercado Livre é estimado (14%).
            </p>
            <div className={k.linha}>
              {faixasTexto.map((texto, i) => (
                <label key={i} className={k.campo} style={{ flex: "0 0 auto" }}>
                  <span className={k.rotulo}>Faixa {i + 1} (%)</span>
                  <input
                    className={k.inputCurto}
                    inputMode="decimal"
                    value={texto}
                    onChange={(e) => {
                      setFaixasTexto((atual) => atual.map((t, j) => (j === i ? e.target.value : t)));
                      alterou();
                    }}
                  />
                </label>
              ))}
              {faixasTexto.length < 5 && (
                <button type="button" className={k.botaoLink} onClick={() => setFaixasTexto((a) => [...a, ""])}>
                  + faixa
                </button>
              )}
              {faixasTexto.length > 1 && (
                <button type="button" className={k.botaoLink} onClick={() => setFaixasTexto((a) => a.slice(0, -1))}>
                  − faixa
                </button>
              )}
            </div>

            {sugestoes.length === 0 ? (
              <p className={k.vazio}>Adicione itens para ver as faixas de preço.</p>
            ) : (
              <div className={k.faixas}>
                {sugestoes.map((s) => (
                  <button
                    key={s.faixaPercentual}
                    type="button"
                    className={`${k.faixa} ${precoCentavos === s.precoCentavos ? k.faixaEscolhida : ""}`}
                    disabled={s.bloqueada}
                    aria-pressed={precoCentavos === s.precoCentavos}
                    onClick={() => escolherPreco(s.precoCentavos)}
                  >
                    <span className={k.faixaTopo}>
                      <span className={k.faixaDesconto}>−{formatarPercentual(s.faixaPercentual)}</span>
                      <span className={k.faixaPreco}>{formatarPreco(s.precoCentavos)}</span>
                    </span>
                    <span className={k.faixaEconomia}>Cliente economiza {formatarPreco(s.economiaCentavos)}</span>
                    <Reguas avaliacao={s} piso={piso} />
                    {s.bloqueada && <span className={k.motivo}>Abaixo do piso de lucro no site.</span>}
                    {!s.bloqueada && s.margens.some((m) => m.abaixoDoPiso) && (
                      <span className={k.motivo}>
                        Abaixo do piso em {s.margens.filter((m) => m.abaixoDoPiso).map((m) => m.rotulo).join(" e ")}: ajuste o preço desse canal na calculadora.
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className={k.legenda}>
              <span className={k.legendaPiso} aria-hidden="true" /> piso de lucro
            </p>

            <div className={k.linha} style={{ marginTop: "0.9rem" }}>
              <label className={k.campo}>
                <span className={k.rotulo}>Preço próprio (R$)</span>
                <input className={k.input} inputMode="decimal" value={precoProprioReais} onChange={(e) => setPrecoProprioReais(e.target.value)} />
              </label>
              <button type="button" className={styles.btnGhost} onClick={usarPrecoProprio} disabled={linhas.length === 0}>
                Usar este preço
              </button>
            </div>
          </section>

          <section className={k.card}>
            <h2 className={k.cardTitulo}>Preço do kit</h2>
            {avaliacaoEscolhida ? (
              <>
                <dl className={k.totais}>
                  <div className={k.totalDestaque}>
                    <dt>Preço escolhido</dt>
                    <dd>{formatarPreco(avaliacaoEscolhida.precoCentavos)}</dd>
                  </div>
                  <div>
                    <dt>Economia do cliente</dt>
                    <dd>{formatarPreco(avaliacaoEscolhida.economiaCentavos)}</dd>
                  </div>
                  <div>
                    <dt>Desconto real</dt>
                    <dd>{formatarPercentual(avaliacaoEscolhida.descontoPercentual)}</dd>
                  </div>
                </dl>
                <div className={k.faixas}>
                  <Reguas avaliacao={avaliacaoEscolhida} piso={piso} />
                </div>
                {avaliacaoEscolhida.naoEstaEmConta && (
                  <p className={k.motivo}>O kit não sai mais em conta que a soma dos valores dos itens.</p>
                )}
                {avaliacaoEscolhida.bloqueada && (
                  <label className={k.nota} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
                    <input type="checkbox" checked={confirmarAbaixoPiso} onChange={(e) => setConfirmarAbaixoPiso(e.target.checked)} />
                    <span>
                      Margem de {formatarPercentual(avaliacaoEscolhida.margens[0].margemPercentual)} no site, abaixo do piso de {formatarPercentual(piso)}. Salvar mesmo assim.
                    </span>
                  </label>
                )}
              </>
            ) : (
              <p className={k.vazio}>Escolha uma faixa ou digite um preço próprio.</p>
            )}

            <div className={k.acoes} style={{ marginTop: "1rem" }}>
              <button type="button" className={styles.btnPrimary} onClick={() => salvar()} disabled={!podeSalvar}>
                {salvando ? "Salvando…" : "Salvar kit"}
              </button>
              <button type="button" className={styles.btnGhost} onClick={gerarProduto} disabled={!salvoEPrecificado || gerandoProduto}>
                {gerandoProduto ? "Gerando…" : produtoDoKitId ? "Atualizar produto do kit" : "Criar produto do kit"}
              </button>
              {salvoEPrecificado ? (
                <Link href={`/admin/produtos/calculadora?kit=${kitId}`} className={styles.btnGhost}>
                  Levar para a calculadora
                </Link>
              ) : (
                <button type="button" className={styles.btnGhost} disabled>
                  Levar para a calculadora
                </button>
              )}
            </div>
            {motivoAcoes && <p className={k.nota}>{motivoAcoes}</p>}
            {produtoDoKitId && (
              <p className={k.nota}>
                <Link href={`/admin/produtos/${produtoDoKitId}/editar`}>Abrir produto do kit</Link>
              </p>
            )}
            {kitId && (
              <div className={k.acoes} style={{ marginTop: "1rem" }}>
                {confirmandoExclusao ? (
                  <>
                    <span className={k.nota}>Excluir o kit? Os produtos continuam no catálogo.</span>
                    <button type="button" className={styles.btnDanger} onClick={excluir}>
                      Confirmar exclusão
                    </button>
                    <button type="button" className={k.botaoLink} onClick={() => setConfirmandoExclusao(false)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.btnDanger} onClick={() => setConfirmandoExclusao(true)}>
                    Excluir kit
                  </button>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
