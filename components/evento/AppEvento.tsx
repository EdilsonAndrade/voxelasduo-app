"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AREA_EVENTO } from "@/lib/auth/papeis";
import { LOGIN_EVENTO } from "@/lib/auth/rotaProtegida";
import type { PedidoEventoJson, StatusPedidoEvento } from "@/lib/models/pedidoEvento";
import FormularioPedido, { type PedidoConhecido } from "./FormularioPedido";
import ListaPedidos, { type LinhaPedido } from "./ListaPedidos";
import { entradaParaForm, formParaEntrada, novoPedidoForm, pedidoParaForm, type PedidoForm } from "./modelo";
import { apagarDb, lerDb } from "./offline/db";
import {
  assinarFila,
  enfileirarPedido,
  gravarCachePedidos,
  lerCachePedidos,
  lerUltimoEvento,
  listarFila,
  sincronizarFila,
  tentarDeNovo,
  type EntradaFila,
  type EstadoFila,
} from "./offline/fila";
import styles from "./evento.module.css";

type Aba = "anotar" | "pedidos";

const ESTADO_INICIAL: EstadoFila = { pendentes: 0, comErro: 0, enviando: false, semInternet: false, precisaEntrar: false };

function BarraSincronizacao({ estado }: { estado: EstadoFila }) {
  const { pendentes, comErro, enviando, semInternet, precisaEntrar } = estado;

  if (precisaEntrar) {
    return (
      <a className={`${styles.sync} ${styles.syncErro}`} href={LOGIN_EVENTO}>
        Entre de novo para enviar {pendentes} {pendentes === 1 ? "pedido" : "pedidos"}
      </a>
    );
  }
  if (comErro > 0) {
    return (
      <button type="button" className={`${styles.sync} ${styles.syncErro}`} onClick={() => void tentarDeNovo()}>
        {comErro} com erro · Tentar de novo
      </button>
    );
  }
  if (pendentes > 0) {
    return (
      <button type="button" className={`${styles.sync} ${styles.syncPendente}`} onClick={() => void sincronizarFila()}>
        {enviando && !semInternet ? `Enviando ${pendentes}…` : `${pendentes} aguardando internet`}
      </button>
    );
  }
  return (
    <span className={`${styles.sync} ${styles.syncOk}`} role="status">
      ✓ Tudo enviado
    </span>
  );
}

function entradaParaLinha(e: EntradaFila): LinhaPedido {
  return {
    id: e.id,
    nome: e.pedido.cliente.nome,
    telefone: e.pedido.cliente.telefone.replace(/\D/g, ""),
    evento: e.pedido.evento,
    itens: e.pedido.itens.map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, fotos: i.fotos.length })),
    valorCentavos: e.pedido.valorCentavos,
    observacao: e.pedido.observacao,
    status: e.pedido.status,
    autor: e.autor,
    criadoEm: e.pedido.criadoEm,
    pendente: true,
    erro: e.estado === "erro" ? e.erro : undefined,
  };
}

function pedidoParaLinha(p: PedidoEventoJson): LinhaPedido {
  return {
    id: p._id,
    nome: p.cliente.nome,
    telefone: p.cliente.telefone,
    evento: p.evento,
    itens: p.itens.map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, fotos: i.fotos.length })),
    valorCentavos: p.valorCentavos,
    observacao: p.observacao,
    status: p.status,
    autor: p.criadoPor.nome,
    criadoEm: p.criadoEm,
    pendente: false,
  };
}

/** App de celular da equipe de evento (EDI-125): abas Anotar / Pedidos, fila offline sempre visível. */
export default function AppEvento({ usuario }: { usuario: string }) {
  const [aba, setAba] = useState<Aba>("anotar");
  const [pronto, setPronto] = useState(false);
  const [ultimoEvento, setUltimoEvento] = useState("");
  const [formNovo, setFormNovo] = useState<PedidoForm | null>(null);
  const [editando, setEditando] = useState<PedidoForm | null>(null);
  const [servidor, setServidor] = useState<PedidoEventoJson[]>([]);
  const [fila, setFila] = useState<EntradaFila[]>([]);
  const [estadoFila, setEstadoFila] = useState<EstadoFila>(ESTADO_INICIAL);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [listaOffline, setListaOffline] = useState(false);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const recarregarLocal = useCallback(async () => {
    const [entradas, cache] = await Promise.all([listarFila().catch(() => []), lerCachePedidos()]);
    setFila(entradas);
    setServidor(cache);
  }, []);

  const buscarServidor = useCallback(async () => {
    setCarregandoLista(true);
    setErroLista(null);
    try {
      const resposta = await fetch("/api/admin/evento/pedidos", { cache: "no-store" });
      if (!resposta.ok) {
        setErroLista(`Não foi possível atualizar a lista (erro ${resposta.status}).`);
        return;
      }
      const { pedidos } = (await resposta.json()) as { pedidos: PedidoEventoJson[] };
      setServidor(pedidos);
      setListaOffline(false);
      await gravarCachePedidos(pedidos);
    } catch {
      setListaOffline(true);
    } finally {
      setCarregandoLista(false);
    }
  }, []);

  // Início: service worker, último evento, rascunho, fila e lista guardada.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-evento.js", { scope: AREA_EVENTO }).catch(() => undefined);
    }

    void (async () => {
      const evento = await lerUltimoEvento();
      const rascunho = await lerDb<PedidoForm>("rascunho", "atual").catch(() => undefined);
      setUltimoEvento(evento);
      setFormNovo(rascunho?.novo ? rascunho : novoPedidoForm(evento));
      await recarregarLocal();
      setPronto(true);
      void buscarServidor();
      void sincronizarFila();
    })();
  }, [buscarServidor, recarregarLocal]);

  // A fila avisa a cada mudança: atualiza a barra e a lista (pedidos enviados entram no cache).
  useEffect(
    () =>
      assinarFila((estado) => {
        setEstadoFila(estado);
        void recarregarLocal();
      }),
    [recarregarLocal]
  );

  // Envio automático: ao voltar a internet e, enquanto houver pendentes, a cada 20 s.
  useEffect(() => {
    const aoReconectar = () => {
      void sincronizarFila();
      void buscarServidor();
    };
    window.addEventListener("online", aoReconectar);
    return () => window.removeEventListener("online", aoReconectar);
  }, [buscarServidor]);

  useEffect(() => {
    if (estadoFila.pendentes === 0) return;
    const timer = setInterval(() => void sincronizarFila(), 20_000);
    return () => clearInterval(timer);
  }, [estadoFila.pendentes]);

  // Aviso do navegador ao fechar a aba com pedidos ainda não enviados.
  useEffect(() => {
    if (estadoFila.pendentes + estadoFila.comErro === 0) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [estadoFila.pendentes, estadoFila.comErro]);

  useEffect(() => {
    if (!confirmacao) return;
    const timer = setTimeout(() => setConfirmacao(null), 1800);
    return () => clearTimeout(timer);
  }, [confirmacao]);

  const linhas = useMemo(() => {
    const naFila = new Map(fila.map((e) => [e.id, entradaParaLinha(e)]));
    const doServidor = servidor.filter((p) => !naFila.has(p._id)).map(pedidoParaLinha);
    return [...naFila.values(), ...doServidor].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [fila, servidor]);

  const conhecidos: PedidoConhecido[] = useMemo(
    () => linhas.map((l) => ({ id: l.id, nome: l.nome, telefone: l.telefone, evento: l.evento })),
    [linhas]
  );

  const eventos = useMemo(() => Array.from(new Set(linhas.map((l) => l.evento))), [linhas]);

  function formDoPedido(id: string): PedidoForm | null {
    const naFila = fila.find((e) => e.id === id);
    if (naFila) return entradaParaForm(naFila);
    const doServidor = servidor.find((p) => p._id === id);
    return doServidor ? pedidoParaForm(doServidor) : null;
  }

  function abrirEdicao(id: string) {
    const form = formDoPedido(id);
    if (!form) return;
    setEditando(form);
    setAba("pedidos");
    window.scrollTo({ top: 0 });
  }

  async function mudarStatus(id: string, status: StatusPedidoEvento) {
    const form = formDoPedido(id);
    if (!form) return;
    await enfileirarPedido(formParaEntrada({ ...form, status }, usuario)).catch(() =>
      setErroLista("Não deu para guardar a mudança no celular.")
    );
  }

  async function aoSalvarNovo(form: PedidoForm) {
    await apagarDb("rascunho", "atual").catch(() => undefined);
    setUltimoEvento(form.evento.trim());
    setConfirmacao(`Pedido de ${form.nome.trim()} salvo!`);
    setFormNovo(novoPedidoForm(form.evento.trim()));
    window.scrollTo({ top: 0 });
  }

  function aoSalvarEdicao(form: PedidoForm) {
    setConfirmacao(`Pedido de ${form.nome.trim()} atualizado!`);
    setEditando(null);
  }

  function sair() {
    if (estadoFila.pendentes + estadoFila.comErro > 0) {
      setConfirmandoSaida(true);
      return;
    }
    void signOut({ callbackUrl: LOGIN_EVENTO });
  }

  return (
    <>
      <header className={styles.topo}>
        <div className={styles.topoUsuario}>
          <span className={styles.topoOla}>oi,</span> <strong>{usuario}</strong>
        </div>
        <BarraSincronizacao estado={estadoFila} />
        <button type="button" className={styles.botaoSair} onClick={sair}>
          Sair
        </button>
      </header>

      <main className={styles.conteudo}>
        {!pronto && <p className={styles.carregando}>Abrindo…</p>}

        {pronto && aba === "anotar" && formNovo && (
          <FormularioPedido
            key={formNovo.id}
            inicial={formNovo}
            autor={usuario}
            eventos={eventos}
            conhecidos={conhecidos}
            guardarRascunho
            onSalvo={(form) => void aoSalvarNovo(form)}
            onAbrirExistente={abrirEdicao}
          />
        )}

        {pronto && aba === "pedidos" && editando && (
          <FormularioPedido
            key={`editar-${editando.id}`}
            inicial={editando}
            autor={usuario}
            eventos={eventos}
            conhecidos={conhecidos}
            guardarRascunho={false}
            onSalvo={aoSalvarEdicao}
            onAbrirExistente={abrirEdicao}
            onCancelar={() => setEditando(null)}
          />
        )}

        {pronto && aba === "pedidos" && !editando && (
          <>
            {erroLista && (
              <p className={styles.erroGeral} role="alert">
                {erroLista}
              </p>
            )}
            <ListaPedidos
              linhas={linhas}
              eventoInicial={ultimoEvento}
              carregando={carregandoLista}
              offline={listaOffline}
              onEditar={abrirEdicao}
              onMudarStatus={(id, status) => void mudarStatus(id, status)}
            />
          </>
        )}
      </main>

      <nav className={styles.abas} aria-label="Seções">
        <button
          type="button"
          className={aba === "anotar" ? styles.abaAtiva : styles.aba}
          aria-current={aba === "anotar" ? "page" : undefined}
          onClick={() => {
            setAba("anotar");
            setEditando(null);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Anotar
        </button>
        <button
          type="button"
          className={aba === "pedidos" ? styles.abaAtiva : styles.aba}
          aria-current={aba === "pedidos" ? "page" : undefined}
          onClick={() => {
            setAba("pedidos");
            void buscarServidor();
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
          Pedidos
          {estadoFila.pendentes + estadoFila.comErro > 0 && (
            <span className={styles.abaContador}>{estadoFila.pendentes + estadoFila.comErro}</span>
          )}
        </button>
      </nav>

      {confirmacao && (
        <div className={styles.confirmacao} role="status" aria-live="assertive" onClick={() => setConfirmacao(null)}>
          <div className={styles.confirmacaoCubo} aria-hidden="true">
            ✓
          </div>
          <p>{confirmacao}</p>
          <span>
            {estadoFila.semInternet ? "Guardado no celular. Vai enviar quando tiver internet." : "Pode anotar o próximo."}
          </span>
        </div>
      )}

      {confirmandoSaida && (
        <div className={styles.modalFundo} role="dialog" aria-modal="true" aria-labelledby="sair-titulo">
          <div className={styles.modal}>
            <h2 id="sair-titulo">Ainda tem pedido para enviar</h2>
            <p>
              {estadoFila.pendentes + estadoFila.comErro} pedido(s) ainda estão só neste celular. Se sair, eles continuam
              guardados aqui e são enviados quando alguém entrar de novo neste celular. Não limpe os dados do navegador.
            </p>
            <button type="button" className={styles.botaoPrincipal} onClick={() => setConfirmandoSaida(false)}>
              Ficar e esperar enviar
            </button>
            <button
              type="button"
              className={styles.botaoPerigo}
              onClick={() => void signOut({ callbackUrl: LOGIN_EVENTO })}
            >
              Sair mesmo assim
            </button>
          </div>
        </div>
      )}
    </>
  );
}
