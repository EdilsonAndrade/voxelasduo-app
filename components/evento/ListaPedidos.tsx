"use client";

import { useMemo, useState } from "react";
import { linkWhatsappCliente, mascararTelefone, somenteDigitos } from "@/lib/eventos/telefone";
import { normalizarNomeEvento } from "@/lib/eventos/validacao";
import {
  ROTULO_STATUS_PEDIDO_EVENTO,
  STATUS_PEDIDO_EVENTO,
  type StatusPedidoEvento,
} from "@/lib/models/pedidoEvento";
import { formatarReais } from "./modelo";
import styles from "./evento.module.css";

export interface LinhaPedido {
  id: string;
  nome: string;
  telefone: string;
  evento: string;
  itens: { descricao: string; quantidade: number; fotos: number }[];
  valorCentavos: number | null;
  observacao: string;
  status: StatusPedidoEvento;
  autor: string;
  criadoEm: string;
  /** Ainda está na fila deste aparelho. */
  pendente: boolean;
  erro?: string;
}

interface Props {
  linhas: LinhaPedido[];
  eventoInicial: string;
  carregando: boolean;
  offline: boolean;
  onEditar: (id: string) => void;
  onMudarStatus: (id: string, status: StatusPedidoEvento) => void;
}

const TODOS = "__todos__";

function simplificar(texto: string): string {
  return normalizarNomeEvento(texto);
}

function resumoItem(item: LinhaPedido["itens"][number]): string {
  const nome = item.descricao || (item.fotos > 0 ? "item da foto" : "item");
  return `${item.quantidade}× ${nome}`;
}

function hora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Lista de todos os pedidos de evento, com busca por nome/WhatsApp, filtro por evento e status. */
export default function ListaPedidos({ linhas, eventoInicial, carregando, offline, onEditar, onMudarStatus }: Props) {
  const [busca, setBusca] = useState("");
  const [evento, setEvento] = useState(eventoInicial ? simplificar(eventoInicial) : TODOS);

  const eventos = useMemo(() => {
    const mapa = new Map<string, string>();
    linhas.forEach((l) => mapa.set(simplificar(l.evento), l.evento));
    if (eventoInicial) mapa.set(simplificar(eventoInicial), eventoInicial);
    return Array.from(mapa.entries());
  }, [linhas, eventoInicial]);

  const filtradas = useMemo(() => {
    const termo = simplificar(busca);
    const digitos = somenteDigitos(busca);
    return linhas.filter((l) => {
      if (evento !== TODOS && simplificar(l.evento) !== evento) return false;
      if (!termo) return true;
      return simplificar(l.nome).includes(termo) || (digitos.length > 0 && l.telefone.includes(digitos));
    });
  }, [linhas, busca, evento]);

  return (
    <section className={styles.lista} aria-label="Pedidos anotados">
      <div className={styles.filtros}>
        <label className={styles.campo}>
          <span className={styles.rotulo}>Buscar</span>
          <input
            className={styles.input}
            type="search"
            placeholder="Nome ou WhatsApp"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            enterKeyHint="search"
          />
        </label>
        <label className={styles.campo}>
          <span className={styles.rotulo}>Evento</span>
          <select className={styles.input} value={evento} onChange={(e) => setEvento(e.target.value)}>
            <option value={TODOS}>Todos os eventos</option>
            {eventos.map(([chave, nome]) => (
              <option key={chave} value={chave}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {offline && <p className={styles.avisoOffline}>Sem internet: mostrando a última lista guardada neste celular.</p>}

      <p className={styles.contagem}>
        {carregando ? "Atualizando…" : `${filtradas.length} ${filtradas.length === 1 ? "pedido" : "pedidos"}`}
      </p>

      {filtradas.length === 0 && !carregando && (
        <p className={styles.vazio}>
          {busca ? `Nenhum pedido com "${busca}".` : "Nenhum pedido ainda. Anote o primeiro na aba Anotar."}
        </p>
      )}

      <ul className={styles.cartoes}>
        {filtradas.map((l) => (
          <li key={l.id} className={`${styles.cartao} ${l.pendente ? styles.cartaoPendente : ""}`}>
            <div className={styles.cartaoTopo}>
              <h3>{l.nome}</h3>
              {l.pendente && (
                <span className={l.erro ? styles.seloErro : styles.seloPendente}>
                  {l.erro ? "erro no envio" : "aguardando envio"}
                </span>
              )}
            </div>
            <p className={styles.cartaoTelefone}>{mascararTelefone(l.telefone)}</p>
            <ul className={styles.cartaoItens}>
              {l.itens.map((item, i) => (
                <li key={i}>
                  {resumoItem(item)}
                  {item.fotos > 0 && <span className={styles.temFoto}> · 📷 {item.fotos}</span>}
                </li>
              ))}
            </ul>
            {(l.valorCentavos !== null || l.observacao) && (
              <p className={styles.cartaoExtra}>
                {l.valorCentavos !== null && <strong>{formatarReais(l.valorCentavos)}</strong>}
                {l.valorCentavos !== null && l.observacao && " · "}
                {l.observacao}
              </p>
            )}
            {l.erro && <p className={styles.erroCampo}>{l.erro}</p>}
            <p className={styles.assinatura}>
              anotado por {l.autor} · {l.evento} · {hora(l.criadoEm)}
            </p>

            <div className={styles.cartaoAcoes}>
              <label className={styles.statusSelect}>
                <span className={styles.somenteLeitor}>Status</span>
                <select
                  value={l.status}
                  onChange={(e) => onMudarStatus(l.id, e.target.value as StatusPedidoEvento)}
                  data-status={l.status}
                >
                  {STATUS_PEDIDO_EVENTO.map((status) => (
                    <option key={status} value={status}>
                      {ROTULO_STATUS_PEDIDO_EVENTO[status]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={styles.botaoSecundario} onClick={() => onEditar(l.id)}>
                Editar
              </button>
              <a
                className={styles.botaoWhatsapp}
                href={linkWhatsappCliente(l.telefone, l.nome, l.evento)}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
