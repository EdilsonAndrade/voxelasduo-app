"use client";

import { useEffect, useState } from "react";
import { mascararTelefone, somenteDigitos } from "@/lib/eventos/telefone";
import { normalizarNomeEvento, validarPedidoEvento, type ErrosPedidoEvento } from "@/lib/eventos/validacao";
import {
  LIMITES_PEDIDO_EVENTO as L,
  ROTULO_STATUS_PEDIDO_EVENTO,
  STATUS_PEDIDO_EVENTO,
  type StatusPedidoEvento,
} from "@/lib/models/pedidoEvento";
import ItemPedido from "./ItemPedido";
import { formParaEntrada, novoItem, valorParaCentavos, type ItemForm, type PedidoForm } from "./modelo";
import { gravarDb } from "./offline/db";
import { enfileirarPedido, gravarUltimoEvento } from "./offline/fila";
import styles from "./evento.module.css";

export interface PedidoConhecido {
  id: string;
  nome: string;
  telefone: string;
  evento: string;
}

interface Props {
  inicial: PedidoForm;
  autor: string;
  eventos: string[];
  conhecidos: PedidoConhecido[];
  /** Nomes dos produtos do catálogo, sugeridos no campo de cada item. */
  produtos: string[];
  /** Só o pedido novo guarda rascunho no aparelho. */
  guardarRascunho: boolean;
  onSalvo: (form: PedidoForm) => void;
  onAbrirExistente: (id: string) => void;
  onCancelar?: () => void;
}

/** Ordem dos campos na tela — a rolagem vai até o primeiro erro nesta ordem. */
function idDoCampo(chave: string): string {
  if (chave === "evento") return "campo-evento";
  if (chave === "cliente.nome") return "campo-nome";
  if (chave === "cliente.telefone") return "campo-telefone";
  const item = /^itens\.(\d+)/.exec(chave);
  if (item) return `item-${item[1]}`;
  if (chave === "itens") return "item-0";
  return "mais-detalhes";
}

export default function FormularioPedido({
  inicial,
  autor,
  eventos,
  conhecidos,
  produtos,
  guardarRascunho,
  onSalvo,
  onAbrirExistente,
  onCancelar,
}: Props) {
  const [form, setForm] = useState<PedidoForm>(inicial);
  const [erros, setErros] = useState<ErrosPedidoEvento>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [trocandoEvento, setTrocandoEvento] = useState(!inicial.evento);
  const [maisDetalhes, setMaisDetalhes] = useState(!!(inicial.valor || inicial.observacao) || !inicial.novo);
  const [salvando, setSalvando] = useState(false);
  const [duplicado, setDuplicado] = useState<PedidoConhecido | null>(null);

  // Rascunho do pedido novo: sobrevive a fechar/recarregar a tela no meio do preenchimento.
  useEffect(() => {
    if (!guardarRascunho) return;
    const timer = setTimeout(() => void gravarDb("rascunho", form, "atual").catch(() => undefined), 400);
    return () => clearTimeout(timer);
  }, [form, guardarRascunho]);

  function atualizar(parcial: Partial<PedidoForm>) {
    setForm((atual) => ({ ...atual, ...parcial }));
  }

  function atualizarItem(indice: number, item: ItemForm) {
    setForm((atual) => ({ ...atual, itens: atual.itens.map((it, i) => (i === indice ? item : it)) }));
  }

  function removerItem(indice: number) {
    setForm((atual) => ({ ...atual, itens: atual.itens.filter((_, i) => i !== indice) }));
    setErros({});
  }

  function adicionarItem() {
    setForm((atual) => ({ ...atual, itens: [...atual.itens, novoItem()] }));
    // Leva a tela até o item novo para já tirar a foto.
    setTimeout(() => document.getElementById(`item-${form.itens.length}`)?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function validar(): ErrosPedidoEvento {
    const entrada = formParaEntrada(form, autor);
    const novosErros = validarPedidoEvento(entrada.pedido);
    if (Number.isNaN(valorParaCentavos(form.valor))) novosErros.valorCentavos = "Valor inválido. Use só números, ex.: 30,50";
    return novosErros;
  }

  async function salvar(ignorarDuplicado = false) {
    setErroGeral(null);
    const novosErros = validar();
    setErros(novosErros);

    const chaves = Object.keys(novosErros);
    if (chaves.length > 0) {
      if (novosErros.evento) setTrocandoEvento(true);
      if (novosErros.valorCentavos || novosErros.observacao) setMaisDetalhes(true);
      setTimeout(
        () => document.getElementById(idDoCampo(chaves[0]))?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50
      );
      return;
    }

    if (form.novo && !ignorarDuplicado) {
      const telefone = somenteDigitos(form.telefone);
      const evento = normalizarNomeEvento(form.evento);
      const existente = conhecidos.find(
        (p) => p.id !== form.id && p.telefone === telefone && normalizarNomeEvento(p.evento) === evento
      );
      if (existente) {
        setDuplicado(existente);
        return;
      }
    }

    setSalvando(true);
    try {
      await enfileirarPedido(formParaEntrada(form, autor));
      await gravarUltimoEvento(form.evento.trim());
      onSalvo(form);
    } catch {
      setErroGeral(
        "Não deu para guardar o pedido no celular. A memória pode estar cheia: libere espaço ou espere a internet e tente de novo."
      );
    } finally {
      setSalvando(false);
      setDuplicado(null);
    }
  }

  return (
    <form
      className={styles.formulario}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void salvar();
      }}
    >
      {!form.novo && (
        <div className={styles.editandoAviso}>
          <span>
            Editando o pedido de <strong>{inicial.nome}</strong>
          </span>
          {onCancelar && (
            <button type="button" className={styles.botaoSecundario} onClick={onCancelar}>
              Voltar
            </button>
          )}
        </div>
      )}

      <section className={styles.bloco} id="campo-evento">
        {trocandoEvento ? (
          <label className={styles.campo}>
            <span className={styles.rotulo}>Evento</span>
            <input
              className={styles.input}
              list="eventos-sugestoes"
              value={form.evento}
              maxLength={L.eventoMax}
              placeholder="Ex.: Feira de Sábado"
              onChange={(e) => atualizar({ evento: e.target.value })}
              aria-invalid={!!erros.evento}
            />
            <datalist id="eventos-sugestoes">
              {eventos.map((nome) => (
                <option key={nome} value={nome} />
              ))}
            </datalist>
            {erros.evento && <span className={styles.erroCampo}>{erros.evento}</span>}
          </label>
        ) : (
          <div className={styles.eventoAtual}>
            <span className={styles.rotulo}>Evento</span>
            <strong>{form.evento}</strong>
            <button type="button" className={styles.linkBotao} onClick={() => setTrocandoEvento(true)}>
              trocar
            </button>
          </div>
        )}
      </section>

      <section className={styles.bloco}>
        <label className={styles.campo} id="campo-nome">
          <span className={styles.rotulo}>Nome do cliente</span>
          <input
            className={styles.input}
            value={form.nome}
            maxLength={L.nomeMax}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder="Só o primeiro nome já serve"
            onChange={(e) => atualizar({ nome: e.target.value })}
            aria-invalid={!!erros["cliente.nome"]}
          />
          {erros["cliente.nome"] && <span className={styles.erroCampo}>{erros["cliente.nome"]}</span>}
        </label>

        <label className={styles.campo} id="campo-telefone">
          <span className={styles.rotulo}>WhatsApp</span>
          <input
            className={styles.input}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="next"
            placeholder="(19) 99999-9999"
            value={form.telefone}
            onChange={(e) => atualizar({ telefone: mascararTelefone(e.target.value) })}
            aria-invalid={!!erros["cliente.telefone"]}
          />
          {erros["cliente.telefone"] && <span className={styles.erroCampo}>{erros["cliente.telefone"]}</span>}
        </label>
      </section>

      {erros.itens && <p className={styles.erroCampo}>{erros.itens}</p>}
      {form.itens.map((item, indice) => (
        <ItemPedido
          key={item.id}
          item={item}
          indice={indice}
          produtos={produtos}
          podeRemover={form.itens.length > 1}
          erro={erros[`itens.${indice}`]}
          erroQuantidade={erros[`itens.${indice}.quantidade`]}
          onChange={(novo) => atualizarItem(indice, novo)}
          onRemover={() => removerItem(indice)}
        />
      ))}

      {form.itens.length < L.itensMax && (
        <button type="button" className={styles.botaoAdicionar} onClick={adicionarItem}>
          + Outro item
        </button>
      )}

      <section className={styles.bloco} id="mais-detalhes">
        <button
          type="button"
          className={styles.maisDetalhes}
          aria-expanded={maisDetalhes}
          onClick={() => setMaisDetalhes((v) => !v)}
        >
          {maisDetalhes ? "▾" : "▸"} Mais detalhes <span>(valor, observação{form.novo ? "" : ", status"})</span>
        </button>

        {maisDetalhes && (
          <div className={styles.detalhes}>
            <label className={styles.campo}>
              <span className={styles.rotulo}>Valor ou sinal combinado (R$)</span>
              <input
                className={styles.input}
                inputMode="decimal"
                placeholder="Ex.: 30,00"
                value={form.valor}
                onChange={(e) => atualizar({ valor: e.target.value })}
                aria-invalid={!!erros.valorCentavos}
              />
              {erros.valorCentavos && <span className={styles.erroCampo}>{erros.valorCentavos}</span>}
            </label>

            <label className={styles.campo}>
              <span className={styles.rotulo}>Observação</span>
              <textarea
                className={styles.input}
                rows={3}
                maxLength={L.observacaoMax}
                placeholder="Cor, tamanho, para quando…"
                value={form.observacao}
                onChange={(e) => atualizar({ observacao: e.target.value })}
              />
              {erros.observacao && <span className={styles.erroCampo}>{erros.observacao}</span>}
            </label>

            {!form.novo && (
              <label className={styles.campo}>
                <span className={styles.rotulo}>Status</span>
                <select
                  className={styles.input}
                  value={form.status}
                  onChange={(e) => atualizar({ status: e.target.value as StatusPedidoEvento })}
                >
                  {STATUS_PEDIDO_EVENTO.map((status) => (
                    <option key={status} value={status}>
                      {ROTULO_STATUS_PEDIDO_EVENTO[status]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </section>

      {erroGeral && (
        <p className={styles.erroGeral} role="alert">
          {erroGeral}
        </p>
      )}

      <div className={styles.barraSalvar}>
        <button type="submit" className={styles.botaoPrincipal} disabled={salvando}>
          {salvando ? "Salvando…" : form.novo ? "Salvar pedido" : "Salvar alterações"}
        </button>
      </div>

      {duplicado && (
        <div className={styles.modalFundo} role="dialog" aria-modal="true" aria-labelledby="duplicado-titulo">
          <div className={styles.modal}>
            <h2 id="duplicado-titulo">Já tem pedido de {duplicado.nome} neste evento</h2>
            <p>Quer abrir o pedido que já existe para incluir os itens nele?</p>
            <button type="button" className={styles.botaoPrincipal} onClick={() => onAbrirExistente(duplicado.id)}>
              Abrir o pedido de {duplicado.nome}
            </button>
            <button type="button" className={styles.botaoSecundario} onClick={() => void salvar(true)}>
              Salvar como pedido novo
            </button>
            <button type="button" className={styles.linkBotao} onClick={() => setDuplicado(null)}>
              Voltar
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
