"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import Toast from "@/components/admin/Toast";
import admin from "@/components/admin/admin.module.css";
import { centavosParaCampo, hojeIso, reaisParaCentavos } from "@/lib/controleVendas/formato";
import {
  FORMAS_PAGAMENTO,
  ROTULO_FORMA_PAGAMENTO,
  ROTULO_ORIGEM,
  type FormaPagamento,
  type ItemRomaneio,
  type LugarRomaneio,
  type PagamentoRomaneio,
  type RomaneioJson,
} from "@/lib/models/romaneio";
import {
  adicionarPeca,
  agruparTudoJunto,
  fecharAcerto,
  noLugar,
  pagoNaHora,
  reabrirLugar,
  repassar,
  resumoDoLugar,
  resumoDoRomaneio,
  statusDoRomaneio,
  type ResumoRomaneio,
} from "@/lib/romaneios/calculo";
import type { OpcaoBuscaRomaneio } from "@/lib/romaneios/opcoes";
import { formatarPreco } from "@/lib/produtos/formato";
import BuscaItem, { type EscolhaBusca } from "./BuscaItem";
import styles from "./romaneios.module.css";

/** Na tela o preço e o valor do pagamento são texto ("12,50"); viram centavos ao salvar. */
type ItemEdicao = ItemRomaneio & { precoTexto: string };
type PagamentoEdicao = PagamentoRomaneio & { valorTexto: string };
type LugarEdicao = Omit<LugarRomaneio, "itens" | "pagamentos"> & { itens: ItemEdicao[]; pagamentos: PagamentoEdicao[] };

interface Confirmacao {
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  perigo?: boolean;
  acao: () => void;
}

interface Repasse {
  lugarId: string;
  itemId: string;
  para: string;
  quantidade: string;
}

function novoId(): string {
  return crypto.randomUUID();
}

/** Linhas que vieram das funções de cálculo ganham os textos dos campos. */
function paraEdicao(lugar: LugarRomaneio | LugarEdicao): LugarEdicao {
  return {
    ...lugar,
    itens: lugar.itens.map((i) => ("precoTexto" in i ? (i as ItemEdicao) : { ...i, precoTexto: centavosParaCampo(i.precoCentavos) })),
    pagamentos: lugar.pagamentos.map((p) =>
      "valorTexto" in p ? (p as PagamentoEdicao) : { ...p, valorTexto: centavosParaCampo(p.valorCentavos) }
    ),
  };
}

function lugarVazio(): LugarEdicao {
  return { id: novoId(), nome: "", status: "aberto", itens: [], pagamentos: [] };
}

function inteiroDoCampo(texto: string): number {
  const n = Number(texto);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function Resumo({ resumo }: { resumo: ResumoRomaneio }) {
  return (
    <div className={styles.resumo}>
      <div className={styles.resumoItem}>
        <span className={styles.rotulo}>Peças</span>
        <span className={styles.resumoValor}>{resumo.pecas}</span>
      </div>
      <div className={styles.resumoItem}>
        <span className={styles.rotulo}>Valor levado</span>
        <span className={styles.resumoValor}>{formatarPreco(resumo.valorCentavos)}</span>
      </div>
      {resumo.temAcerto && (
        <>
          <div className={styles.resumoItem}>
            <span className={styles.rotulo}>Ainda fora</span>
            <span className={styles.resumoValor}>{resumo.pecasNoLugar}</span>
          </div>
          <div className={styles.resumoItem}>
            <span className={styles.rotulo}>Vendido</span>
            <span className={styles.resumoValor}>{formatarPreco(resumo.vendidoCentavos)}</span>
          </div>
          <div className={styles.resumoItem}>
            <span className={styles.rotulo}>Pago</span>
            <span className={styles.resumoValor}>{formatarPreco(resumo.pagoCentavos)}</span>
          </div>
          <div className={styles.resumoItem}>
            <span className={styles.rotulo}>A receber</span>
            <span className={`${styles.resumoValor} ${styles.aReceber}`}>{formatarPreco(resumo.aReceberCentavos)}</span>
          </div>
          {resumo.pagoAMaisCentavos > 0 && (
            <div className={styles.resumoItem}>
              <span className={styles.rotulo}>Pago a mais</span>
              <span className={styles.resumoValor}>{formatarPreco(resumo.pagoAMaisCentavos)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Editor do romaneio (specs/038): uma saída com um ou mais lugares. Cada lugar
 * é uma "via" com as peças, o acerto (vendidas, devolvidas, pagamentos) e o
 * status próprio; "Tudo junto" mostra cada peça uma vez com a divisão por lugar.
 * Tudo é editado em memória e gravado de uma vez em "Salvar".
 */
export default function EditorRomaneio({ inicial, opcoes }: { inicial: RomaneioJson | null; opcoes: OpcaoBuscaRomaneio[] }) {
  const router = useRouter();
  const [id, setId] = useState(inicial?.id ?? null);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [dataSaida, setDataSaida] = useState(inicial?.dataSaida ?? hojeIso());
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");
  const [lugares, setLugares] = useState<LugarEdicao[]>(() => (inicial ? inicial.lugares.map(paraEdicao) : [lugarVazio()]));
  const [editandoLugar, setEditandoLugar] = useState<Set<string>>(() => new Set(inicial ? [] : lugares.map((l) => l.id)));
  const [modo, setModo] = useState<"lugar" | "junto">("lugar");
  const [repasse, setRepasse] = useState<Repasse | null>(null);
  const [formaNaHora, setFormaNaHora] = useState<Record<string, FormaPagamento>>({});
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fecharToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!sujo) return;
    function avisar(evento: BeforeUnloadEvent) {
      evento.preventDefault();
    }
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);

  const resumoGeral = useMemo(() => resumoDoRomaneio(lugares), [lugares]);
  const status = statusDoRomaneio(lugares);
  const tudoJunto = useMemo(() => (modo === "junto" ? agruparTudoJunto(lugares) : []), [modo, lugares]);

  function mudarLugares(mudar: (atual: LugarEdicao[]) => LugarEdicao[]) {
    setLugares(mudar);
    setSujo(true);
    setErro(null);
  }

  function mudarLugar(lugarId: string, mudar: (lugar: LugarEdicao) => LugarEdicao) {
    mudarLugares((atual) => atual.map((l) => (l.id === lugarId ? mudar(l) : l)));
  }

  function mudarItem(lugarId: string, itemId: string, mudar: (item: ItemEdicao) => ItemEdicao) {
    mudarLugar(lugarId, (l) => ({ ...l, itens: l.itens.map((i) => (i.id === itemId ? mudar(i) : i)) }));
  }

  function alternarEdicao(lugarId: string, editar: boolean) {
    setEditandoLugar((atual) => {
      const novo = new Set(atual);
      if (editar) novo.add(lugarId);
      else novo.delete(lugarId);
      return novo;
    });
  }

  function adicionar(lugarId: string, escolha: EscolhaBusca) {
    const peca =
      "opcao" in escolha
        ? {
            origem: escolha.opcao.origem,
            origemId: escolha.opcao.origemId,
            nome: escolha.opcao.nome,
            precoCentavos: escolha.opcao.precoCentavos ?? 0,
            quantidade: 1,
          }
        : { origem: "livre" as const, nome: escolha.livre, precoCentavos: 0, quantidade: 1 };
    const semPreco = "livre" in escolha || escolha.opcao.precoCentavos === null;
    const lugar = lugares.find((l) => l.id === lugarId)!;
    // Peça sem preço nunca soma numa linha existente: o preço ainda vai ser digitado.
    const { itens, somou } = semPreco
      ? { itens: [...lugar.itens, { id: novoId(), ...peca, levada: 1, vendida: 0, devolvida: 0 }], somou: false }
      : adicionarPeca(lugar.itens, peca, novoId());
    mudarLugar(lugarId, (l) => paraEdicao({ ...l, itens: itens.map((i) => ("precoTexto" in i ? i : { ...i, precoTexto: semPreco ? "" : centavosParaCampo(i.precoCentavos) })) }));
    if (somou) setToast(`"${peca.nome}" já estava em ${lugar.nome || "este lugar"}: a quantidade foi somada.`);
  }

  function removerItem(lugar: LugarEdicao, item: ItemEdicao) {
    const remover = () => mudarLugar(lugar.id, (l) => ({ ...l, itens: l.itens.filter((i) => i.id !== item.id) }));
    if (item.vendida > 0 || item.devolvida > 0) {
      setConfirmacao({
        titulo: "Remover peça com acerto?",
        mensagem: `"${item.nome}" já tem vendidas ou devolvidas registradas em ${lugar.nome || "este lugar"}.`,
        textoConfirmar: "Remover",
        perigo: true,
        acao: remover,
      });
    } else remover();
  }

  function confirmarRepasse() {
    if (!repasse) return;
    const resultado = repassar(
      lugares as LugarRomaneio[],
      { lugarId: repasse.lugarId, itemId: repasse.itemId },
      repasse.para,
      Number(repasse.quantidade),
      novoId()
    );
    if (!resultado.lugares) {
      setErro(resultado.erro ?? "Não foi possível repassar.");
      return;
    }
    mudarLugares(() => resultado.lugares!.map(paraEdicao));
    const destino = lugares.find((l) => l.id === repasse.para);
    setToast(`${repasse.quantidade} repassada(s) para ${destino?.nome || "o outro lugar"}.`);
    setRepasse(null);
  }

  function adicionarLugar() {
    const lugar = lugarVazio();
    mudarLugares((atual) => [...atual, lugar]);
    alternarEdicao(lugar.id, true);
    setModo("lugar");
  }

  function excluirLugar(lugar: LugarEdicao) {
    if (lugares.length === 1) {
      setErro("O romaneio precisa de ao menos um lugar.");
      return;
    }
    if (lugar.itens.length > 0) {
      setErro(`Repasse ou remova as peças de ${lugar.nome || "este lugar"} antes de excluí-lo.`);
      return;
    }
    mudarLugares((atual) => atual.filter((l) => l.id !== lugar.id));
  }

  function pedirFecharAcerto(lugar: LugarEdicao) {
    const resumo = resumoDoLugar(lugar);
    const fechar = () => mudarLugar(lugar.id, (l) => paraEdicao(fecharAcerto(l as LugarRomaneio, hojeIso())));
    const pendencias = [
      resumo.pecasNoLugar > 0 ? `${resumo.pecasNoLugar} peça(s) ainda no lugar` : null,
      resumo.aReceberCentavos > 0 ? `${formatarPreco(resumo.aReceberCentavos)} a receber` : null,
    ].filter(Boolean);
    if (pendencias.length === 0) {
      fechar();
      return;
    }
    setConfirmacao({
      titulo: "Fechar acerto com pendências?",
      mensagem: `${lugar.nome || "Este lugar"} ainda tem ${pendencias.join(" e ")}.`,
      textoConfirmar: "Fechar acerto",
      acao: fechar,
    });
  }

  function pedirPagoNaHora(lugar: LugarEdicao) {
    const forma = formaNaHora[lugar.id] ?? "pix";
    const aplicar = () => mudarLugar(lugar.id, (l) => paraEdicao(pagoNaHora(l as LugarRomaneio, forma, hojeIso(), novoId())));
    if (resumoDoLugar(lugar).temAcerto) {
      setConfirmacao({
        titulo: "Substituir o acerto?",
        mensagem: `${lugar.nome || "Este lugar"} já tem vendas, devoluções ou pagamentos. "Pago na hora" marca tudo como vendido e troca os pagamentos por um só, do total.`,
        textoConfirmar: "Pago na hora",
        acao: aplicar,
      });
    } else aplicar();
  }

  function adicionarPagamento(lugarId: string) {
    mudarLugar(lugarId, (l) => {
      const resumo = resumoDoLugar(l);
      const valor = resumo.aReceberCentavos;
      return {
        ...l,
        pagamentos: [
          ...l.pagamentos,
          { id: novoId(), valorCentavos: valor, valorTexto: valor > 0 ? centavosParaCampo(valor) : "", data: hojeIso(), forma: "pix" },
        ],
      };
    });
  }

  function mudarPagamento(lugarId: string, pagamentoId: string, mudar: (p: PagamentoEdicao) => PagamentoEdicao) {
    mudarLugar(lugarId, (l) => ({ ...l, pagamentos: l.pagamentos.map((p) => (p.id === pagamentoId ? mudar(p) : p)) }));
  }

  /** Corpo do PUT/POST — e a primeira mensagem de erro que dá para apontar já na tela. */
  function montarCorpo(): { corpo?: unknown; erro?: string } {
    for (const lugar of lugares) {
      const onde = lugar.nome || "lugar sem nome";
      for (const item of lugar.itens) {
        if (reaisParaCentavos(item.precoTexto) === null) return { erro: `${onde}: preencha o preço de "${item.nome}".` };
      }
      for (const pagamento of lugar.pagamentos) {
        const valor = reaisParaCentavos(pagamento.valorTexto);
        if (!valor) return { erro: `${onde}: informe o valor do pagamento de ${dataCurta(pagamento.data)}.` };
      }
    }
    return {
      corpo: {
        nome,
        dataSaida,
        observacao,
        lugares: lugares.map((lugar) => ({
          ...lugar,
          itens: lugar.itens.map((item) => ({ ...item, precoTexto: undefined })),
          pagamentos: lugar.pagamentos.map((pagamento) => ({ ...pagamento, valorTexto: undefined })),
        })),
      },
    };
  }

  async function salvar() {
    const { corpo, erro: erroLocal } = montarCorpo();
    if (!corpo) {
      setErro(erroLocal ?? "Confira os campos.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch(id ? `/api/admin/romaneios/${id}` : "/api/admin/romaneios", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const json = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(json?.erro ?? `Erro ${resposta.status} ao salvar.`);
      const salvo = json.romaneio as RomaneioJson;
      setLugares(salvo.lugares.map(paraEdicao));
      setSujo(false);
      setToast("Romaneio salvo.");
      if (!id) {
        setId(salvo.id);
        router.replace(`/admin/romaneios/${salvo.id}`);
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  function pedirExclusao() {
    if (!id) {
      router.push("/admin/romaneios");
      return;
    }
    setConfirmacao({
      titulo: "Excluir romaneio?",
      mensagem: `"${nome}" e o acerto de todos os lugares serão apagados.`,
      textoConfirmar: "Excluir",
      perigo: true,
      acao: async () => {
        const resposta = await fetch(`/api/admin/romaneios/${id}`, { method: "DELETE" });
        if (!resposta.ok) {
          const json = await resposta.json().catch(() => null);
          setErro(json?.erro ?? `Erro ${resposta.status} ao excluir.`);
          return;
        }
        setSujo(false);
        router.push("/admin/romaneios");
      },
    });
  }

  const podeImprimir = Boolean(id) && !sujo;

  return (
    <div className="container">
      <div className={admin.bar}>
        <h1>{id ? nome || "Romaneio" : "Novo romaneio"}</h1>
        <div className={admin.barAcoes}>
          <Link href="/admin/romaneios" className={styles.botaoTexto}>
            Voltar aos romaneios
          </Link>
          <button type="button" className={styles.botaoPerigo} onClick={pedirExclusao}>
            {id ? "Excluir romaneio" : "Descartar"}
          </button>
        </div>
      </div>

      <div className={styles.pagina}>
        <section className={styles.card} aria-label="Dados da saída">
          <div className={styles.linha}>
            <label className={`${styles.campo} ${styles.campoLargo}`}>
              <span className={styles.rotulo}>Nome do romaneio</span>
              <input
                className={styles.input}
                value={nome}
                maxLength={120}
                placeholder="Ex.: Saída 31/10"
                onChange={(e) => {
                  setNome(e.target.value);
                  setSujo(true);
                }}
              />
            </label>
            <label className={styles.campo}>
              <span className={styles.rotulo}>Data de saída</span>
              <input
                className={styles.input}
                type="date"
                value={dataSaida}
                onChange={(e) => {
                  setDataSaida(e.target.value);
                  setSujo(true);
                }}
              />
            </label>
            <label className={`${styles.campo} ${styles.campoLargo}`}>
              <span className={styles.rotulo}>Observação</span>
              <input
                className={styles.input}
                value={observacao}
                maxLength={500}
                placeholder="Opcional"
                onChange={(e) => {
                  setObservacao(e.target.value);
                  setSujo(true);
                }}
              />
            </label>
          </div>
        </section>

        <div className={styles.barraModos}>
          <div className={styles.alternador} role="group" aria-label="Como ver as peças">
            <button type="button" aria-pressed={modo === "lugar"} onClick={() => setModo("lugar")}>
              Por lugar
            </button>
            <button type="button" aria-pressed={modo === "junto"} onClick={() => setModo("junto")}>
              Tudo junto
            </button>
          </div>
          <button type="button" className={styles.botaoPequeno} onClick={adicionarLugar}>
            + Lugar
          </button>
        </div>

        {modo === "junto" ? (
          <section className={styles.card} aria-label="Todas as peças">
            {tudoJunto.length === 0 ? (
              <p className={styles.viaMeta}>Nenhuma peça ainda. Volte para “Por lugar” e adicione as peças em cada lugar.</p>
            ) : (
              <div className={styles.tabelaWrap}>
                <table className={styles.tabela}>
                  <thead>
                    <tr>
                      <th>Peça</th>
                      <th className={styles.num}>Levadas</th>
                      <th className={styles.num}>Preço</th>
                      <th className={styles.num}>Subtotal</th>
                      <th className={styles.num}>Vendidas</th>
                      <th className={styles.num}>Devolvidas</th>
                      <th className={styles.num}>Ainda fora</th>
                      <th>Onde está</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tudoJunto.map((linha) => (
                      <tr key={linha.chave}>
                        <td>
                          <span className={styles.nomeItem}>{linha.nome}</span>
                          <span className={`${styles.etiqueta} ${styles[`etiqueta_${linha.origem}`]}`}>{ROTULO_ORIGEM[linha.origem]}</span>
                        </td>
                        <td className={styles.num}>{linha.levada}</td>
                        <td className={styles.num}>{formatarPreco(linha.precoCentavos)}</td>
                        <td className={styles.num}>{formatarPreco(linha.levada * linha.precoCentavos)}</td>
                        <td className={styles.num}>{linha.vendida}</td>
                        <td className={styles.num}>{linha.devolvida}</td>
                        <td className={styles.num}>{linha.noLugar}</td>
                        <td className={styles.divisao}>{linha.porLugar.map((p) => `${p.lugar || "sem nome"} ${p.levada}`).join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          lugares.map((lugar) => {
            const resumo = resumoDoLugar(lugar);
            const acertado = lugar.status === "acertado";
            const editando = editandoLugar.has(lugar.id);
            const outros = lugares.filter((l) => l.id !== lugar.id);
            return (
              <section key={lugar.id} className={`${styles.via} ${acertado ? styles.viaAcertada : ""}`} aria-label={lugar.nome || "Lugar sem nome"}>
                {acertado && (
                  <span className={styles.carimbo} aria-hidden="true">
                    Acertado {lugar.acertadoEm ? dataCurta(lugar.acertadoEm) : ""}
                  </span>
                )}
                <div className={styles.viaTopo}>
                  <div>
                    <h2 className={styles.viaNome}>{lugar.nome || "Lugar sem nome"}</h2>
                    <p className={styles.viaMeta}>
                      {[lugar.levadoPor && `levado por ${lugar.levadoPor}`, lugar.contato].filter(Boolean).join(" · ") || "Sem contato"}
                      {acertado ? " · acertado" : " · aberto"}
                    </p>
                  </div>
                  <div className={styles.viaAcoes}>
                    <button type="button" className={styles.botaoTexto} onClick={() => alternarEdicao(lugar.id, !editando)}>
                      {editando ? "Fechar dados" : "Editar dados"}
                    </button>
                    {podeImprimir ? (
                      <Link href={`/admin/romaneios/${id}/imprimir?lugar=${lugar.id}`} className={styles.botaoTexto}>
                        Imprimir este lugar
                      </Link>
                    ) : null}
                    {acertado ? (
                      <button type="button" className={styles.botaoPequeno} onClick={() => mudarLugar(lugar.id, (l) => paraEdicao(reabrirLugar(l as LugarRomaneio)))}>
                        Reabrir
                      </button>
                    ) : (
                      <>
                        <span className={styles.repasse}>
                          <select
                            aria-label={`Forma do pagamento na hora em ${lugar.nome || "este lugar"}`}
                            value={formaNaHora[lugar.id] ?? "pix"}
                            onChange={(e) => setFormaNaHora((f) => ({ ...f, [lugar.id]: e.target.value as FormaPagamento }))}
                          >
                            {FORMAS_PAGAMENTO.map((forma) => (
                              <option key={forma} value={forma}>
                                {ROTULO_FORMA_PAGAMENTO[forma]}
                              </option>
                            ))}
                          </select>
                          <button type="button" className={styles.botaoPequeno} disabled={lugar.itens.length === 0} onClick={() => pedirPagoNaHora(lugar)}>
                            Pago na hora
                          </button>
                        </span>
                        <button type="button" className={styles.botaoPequenoForte} disabled={lugar.itens.length === 0} onClick={() => pedirFecharAcerto(lugar)}>
                          Fechar acerto
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editando && (
                  <div className={styles.formLugar}>
                    <label className={styles.campo}>
                      <span className={styles.rotulo}>Lugar</span>
                      <input
                        className={styles.input}
                        value={lugar.nome}
                        maxLength={80}
                        placeholder="Ex.: Casa da sogra"
                        onChange={(e) => mudarLugar(lugar.id, (l) => ({ ...l, nome: e.target.value }))}
                      />
                    </label>
                    <label className={styles.campo}>
                      <span className={styles.rotulo}>Quem levou</span>
                      <input
                        className={styles.input}
                        value={lugar.levadoPor ?? ""}
                        maxLength={120}
                        placeholder="Opcional"
                        onChange={(e) => mudarLugar(lugar.id, (l) => ({ ...l, levadoPor: e.target.value }))}
                      />
                    </label>
                    <label className={styles.campo}>
                      <span className={styles.rotulo}>Contato</span>
                      <input
                        className={styles.input}
                        value={lugar.contato ?? ""}
                        maxLength={120}
                        placeholder="Telefone ou endereço, opcional"
                        onChange={(e) => mudarLugar(lugar.id, (l) => ({ ...l, contato: e.target.value }))}
                      />
                    </label>
                    <div className={styles.campo} style={{ justifyContent: "flex-end" }}>
                      <button type="button" className={styles.botaoPerigo} onClick={() => excluirLugar(lugar)}>
                        Excluir lugar
                      </button>
                    </div>
                  </div>
                )}

                <fieldset disabled={acertado} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                  {lugar.itens.length > 0 && (
                    <div className={styles.tabelaWrap}>
                      <table className={styles.tabela}>
                        <thead>
                          <tr>
                            <th>Peça</th>
                            <th className={styles.num}>Levadas</th>
                            <th className={styles.num}>Preço</th>
                            <th className={styles.num}>Subtotal</th>
                            <th className={styles.num}>Vendidas</th>
                            <th className={styles.num}>Devolvidas</th>
                            <th className={styles.num}>No lugar</th>
                            <th aria-label="Ações" />
                          </tr>
                        </thead>
                        <tbody>
                          {lugar.itens.map((item) => {
                            const precoVazio = reaisParaCentavos(item.precoTexto) === null;
                            const excedeu = item.vendida + item.devolvida > item.levada;
                            const repassando = repasse?.lugarId === lugar.id && repasse.itemId === item.id;
                            return (
                              <tr key={item.id}>
                                <td>
                                  {item.origem === "livre" ? (
                                    <input
                                      className={styles.input}
                                      aria-label="Nome do item livre"
                                      value={item.nome}
                                      maxLength={120}
                                      onChange={(e) => mudarItem(lugar.id, item.id, (i) => ({ ...i, nome: e.target.value }))}
                                    />
                                  ) : (
                                    <span className={styles.nomeItem}>{item.nome}</span>
                                  )}
                                  <span className={`${styles.etiqueta} ${styles[`etiqueta_${item.origem}`]}`}>{ROTULO_ORIGEM[item.origem]}</span>
                                  {excedeu && <p className={styles.aviso}>Vendidas + devolvidas passam das levadas.</p>}
                                  {repassando && repasse && (
                                    <div className={styles.repasse}>
                                      Repassar
                                      <input
                                        className={styles.inputNum}
                                        type="number"
                                        min={1}
                                        max={noLugar(item)}
                                        aria-label="Quantidade a repassar"
                                        value={repasse.quantidade}
                                        onChange={(e) => setRepasse({ ...repasse, quantidade: e.target.value })}
                                      />
                                      de {noLugar(item)} para
                                      <select aria-label="Lugar de destino" value={repasse.para} onChange={(e) => setRepasse({ ...repasse, para: e.target.value })}>
                                        {outros.map((o) => (
                                          <option key={o.id} value={o.id}>
                                            {o.nome || "Lugar sem nome"}
                                          </option>
                                        ))}
                                      </select>
                                      <button type="button" className={styles.botaoPequenoForte} onClick={confirmarRepasse}>
                                        Repassar
                                      </button>
                                      <button type="button" className={styles.botaoTexto} onClick={() => setRepasse(null)}>
                                        Cancelar
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className={styles.num}>
                                  <input
                                    className={styles.inputNum}
                                    type="number"
                                    min={1}
                                    aria-label={`Levadas de ${item.nome}`}
                                    value={item.levada || ""}
                                    onChange={(e) => mudarItem(lugar.id, item.id, (i) => ({ ...i, levada: inteiroDoCampo(e.target.value) }))}
                                  />
                                </td>
                                <td className={styles.num}>
                                  <input
                                    className={`${styles.inputPreco} ${precoVazio ? styles.inputVazio : ""}`}
                                    inputMode="decimal"
                                    aria-label={`Preço de ${item.nome}`}
                                    placeholder="0,00"
                                    value={item.precoTexto}
                                    onChange={(e) =>
                                      mudarItem(lugar.id, item.id, (i) => ({
                                        ...i,
                                        precoTexto: e.target.value,
                                        precoCentavos: reaisParaCentavos(e.target.value) ?? 0,
                                      }))
                                    }
                                  />
                                </td>
                                <td className={styles.num}>{precoVazio ? <span className={styles.zero}>—</span> : formatarPreco(item.levada * item.precoCentavos)}</td>
                                <td className={styles.num}>
                                  <input
                                    className={styles.inputNum}
                                    type="number"
                                    min={0}
                                    aria-label={`Vendidas de ${item.nome}`}
                                    value={item.vendida}
                                    onChange={(e) => mudarItem(lugar.id, item.id, (i) => ({ ...i, vendida: inteiroDoCampo(e.target.value) }))}
                                  />
                                </td>
                                <td className={styles.num}>
                                  <input
                                    className={styles.inputNum}
                                    type="number"
                                    min={0}
                                    aria-label={`Devolvidas de ${item.nome}`}
                                    value={item.devolvida}
                                    onChange={(e) => mudarItem(lugar.id, item.id, (i) => ({ ...i, devolvida: inteiroDoCampo(e.target.value) }))}
                                  />
                                </td>
                                <td className={`${styles.num} ${noLugar(item) === 0 ? styles.zero : ""}`}>{noLugar(item)}</td>
                                <td className={styles.num}>
                                  {outros.length > 0 && noLugar(item) > 0 && (
                                    <button
                                      type="button"
                                      className={styles.botaoTexto}
                                      onClick={() =>
                                        setRepasse({ lugarId: lugar.id, itemId: item.id, para: outros[0].id, quantidade: String(noLugar(item)) })
                                      }
                                    >
                                      Repassar
                                    </button>
                                  )}
                                  <button type="button" className={styles.botaoPerigo} onClick={() => removerItem(lugar, item)}>
                                    Remover
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td>Total</td>
                            <td className={styles.num}>{resumo.pecas}</td>
                            <td />
                            <td className={styles.num}>{formatarPreco(resumo.valorCentavos)}</td>
                            <td className={styles.num}>{resumo.vendidas}</td>
                            <td className={styles.num}>{resumo.devolvidas}</td>
                            <td className={styles.num}>{resumo.pecasNoLugar}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {!acertado && <BuscaItem opcoes={opcoes} onEscolher={(escolha) => adicionar(lugar.id, escolha)} />}

                  <div className={styles.pagamentos}>
                    {lugar.pagamentos.length > 0 && <span className={styles.rotulo}>Pagamentos recebidos</span>}
                    {lugar.pagamentos.map((pagamento) => (
                      <div key={pagamento.id} className={styles.pagamento}>
                        <input
                          className={styles.inputPreco}
                          inputMode="decimal"
                          aria-label="Valor do pagamento"
                          placeholder="0,00"
                          value={pagamento.valorTexto}
                          onChange={(e) =>
                            mudarPagamento(lugar.id, pagamento.id, (p) => ({
                              ...p,
                              valorTexto: e.target.value,
                              valorCentavos: reaisParaCentavos(e.target.value) ?? 0,
                            }))
                          }
                        />
                        <input
                          type="date"
                          aria-label="Data do pagamento"
                          value={pagamento.data}
                          onChange={(e) => mudarPagamento(lugar.id, pagamento.id, (p) => ({ ...p, data: e.target.value }))}
                        />
                        <select
                          aria-label="Forma do pagamento"
                          value={pagamento.forma}
                          onChange={(e) => mudarPagamento(lugar.id, pagamento.id, (p) => ({ ...p, forma: e.target.value as FormaPagamento }))}
                        >
                          {FORMAS_PAGAMENTO.map((forma) => (
                            <option key={forma} value={forma}>
                              {ROTULO_FORMA_PAGAMENTO[forma]}
                            </option>
                          ))}
                        </select>
                        <input
                          aria-label="Observação do pagamento"
                          placeholder="Observação"
                          maxLength={120}
                          value={pagamento.observacao ?? ""}
                          onChange={(e) => mudarPagamento(lugar.id, pagamento.id, (p) => ({ ...p, observacao: e.target.value }))}
                        />
                        <button
                          type="button"
                          className={styles.botaoPerigo}
                          onClick={() => mudarLugar(lugar.id, (l) => ({ ...l, pagamentos: l.pagamentos.filter((p) => p.id !== pagamento.id) }))}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    {lugar.itens.length > 0 && (
                      <div>
                        <button type="button" className={styles.botaoTexto} onClick={() => adicionarPagamento(lugar.id)}>
                          + Registrar pagamento
                        </button>
                      </div>
                    )}
                  </div>
                </fieldset>

                {lugar.itens.length > 0 && <Resumo resumo={resumo} />}
              </section>
            );
          })
        )}

        <div className={styles.geral}>
          <div>
            <span className={`${styles.status} ${styles[`status_${status}`]}`}>{status}</span>
            {lugares.length > 1 && <span className={styles.viaMeta}> {lugares.length} lugares</span>}
            <Resumo resumo={resumoGeral} />
          </div>
          <div className={styles.viaAcoes}>
            {erro && (
              <p className={styles.erro} role="alert">
                {erro}
              </p>
            )}
            {sujo && !erro && <span className={styles.viaMeta}>Alterações não salvas</span>}
            {podeImprimir ? (
              <Link href={`/admin/romaneios/${id}/imprimir`} className={styles.botaoPequeno}>
                Imprimir / PDF
              </Link>
            ) : (
              <span className={styles.viaMeta}>Salve para imprimir</span>
            )}
            <button type="button" className={admin.btnPrimary} disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        aberto={confirmacao !== null}
        titulo={confirmacao?.titulo ?? ""}
        mensagem={confirmacao?.mensagem ?? ""}
        textoConfirmar={confirmacao?.textoConfirmar}
        variante={confirmacao?.perigo ? "perigo" : "padrao"}
        onConfirmar={() => {
          const acao = confirmacao?.acao;
          setConfirmacao(null);
          acao?.();
        }}
        onCancelar={() => setConfirmacao(null)}
      />
      <Toast mensagem={toast} aoFechar={fecharToast} />
    </div>
  );
}
