import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import {
  EVENTOS_COLLECTION,
  PEDIDOS_EVENTO_COLLECTION,
  type AutorPedidoEvento,
  type Evento,
  type PedidoEvento,
  type PedidoEventoJson,
  type PedidoEventoPayload,
} from "@/lib/models/pedidoEvento";
import { somenteDigitos } from "./telefone";
import { normalizarNomeEvento } from "./validacao";

const garantirIndicesPedidos = criarGarantiaDeIndices();
const garantirIndicesEventos = criarGarantiaDeIndices();

export const LIMITE_LISTA_PEDIDOS_EVENTO = 300;

async function colecaoPedidos() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<PedidoEvento>(PEDIDOS_EVENTO_COLLECTION);
  await garantirIndicesPedidos(() =>
    Promise.all([
      colecao.createIndex({ criadoEm: -1 }),
      colecao.createIndex({ "cliente.telefone": 1 }),
      colecao.createIndex({ eventoId: 1, criadoEm: -1 }),
    ])
  );
  return colecao;
}

async function colecaoEventos() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Evento>(EVENTOS_COLLECTION);
  await garantirIndicesEventos(() => colecao.createIndex({ nomeNormalizado: 1 }, { unique: true }));
  return colecao;
}

/** Acha o evento pelo nome normalizado ou cria, e marca o uso (para a lista "mais recentes primeiro"). */
export async function garantirEvento(nome: string, agora = new Date()): Promise<Evento & { _id: NonNullable<Evento["_id"]> }> {
  const eventos = await colecaoEventos();
  const evento = await eventos.findOneAndUpdate(
    { nomeNormalizado: normalizarNomeEvento(nome) },
    {
      $set: { ultimoUsoEm: agora },
      $setOnInsert: { nome: nome.trim().replace(/\s+/g, " "), nomeNormalizado: normalizarNomeEvento(nome), criadoEm: agora },
    },
    { upsert: true, returnDocument: "after" }
  );
  if (!evento?._id) throw new Error("Não foi possível registrar o evento.");
  return evento as Evento & { _id: NonNullable<Evento["_id"]> };
}

export async function listarEventos(): Promise<{ id: string; nome: string }[]> {
  const eventos = await colecaoEventos();
  const lista = await eventos.find({}).sort({ ultimoUsoEm: -1 }).limit(50).toArray();
  return lista.map((evento) => ({ id: evento._id!.toString(), nome: evento.nome }));
}

/**
 * Grava o pedido pelo UUID do aparelho (upsert): o primeiro envio cria, os
 * seguintes — reenvio da fila ou edição — atualizam o mesmo documento, sem
 * duplicar. Vale a última gravação. `criadoPor`/`criadoEm` só no primeiro.
 */
export async function salvarPedidoEvento(
  id: string,
  dados: PedidoEventoPayload,
  autor: AutorPedidoEvento,
  agora = new Date()
): Promise<{ pedido: PedidoEvento; criado: boolean }> {
  const evento = await garantirEvento(dados.evento, agora);
  const pedidos = await colecaoPedidos();

  // A data vem do aparelho (hora em que foi anotado); nunca no futuro.
  const anotadoEm = new Date(dados.criadoEm);
  const criadoEm = Number.isNaN(anotadoEm.getTime()) || anotadoEm > agora ? agora : anotadoEm;

  const resultado = await pedidos.updateOne(
    { _id: id },
    {
      $set: {
        eventoId: evento._id,
        evento: evento.nome,
        cliente: dados.cliente,
        itens: dados.itens,
        valorCentavos: dados.valorCentavos,
        observacao: dados.observacao,
        status: dados.status,
        atualizadoPor: autor,
        atualizadoEm: agora,
      },
      $setOnInsert: { criadoPor: autor, criadoEm, recebidoEm: agora },
    },
    { upsert: true }
  );

  const pedido = await pedidos.findOne({ _id: id });
  if (!pedido) throw new Error("Pedido não encontrado depois de gravar.");
  return { pedido, criado: resultado.upsertedCount > 0 };
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lista os pedidos de evento, mais recentes primeiro; busca por parte do nome ou dos dígitos do WhatsApp. */
export async function listarPedidosEvento(filtros: { busca?: string; eventoId?: string } = {}): Promise<PedidoEvento[]> {
  const pedidos = await colecaoPedidos();
  const filtro: Record<string, unknown> = {};

  const busca = filtros.busca?.trim();
  if (busca) {
    const ou: Record<string, unknown>[] = [{ "cliente.nome": { $regex: escaparRegex(busca), $options: "i" } }];
    const digitos = somenteDigitos(busca);
    if (digitos.length > 0) ou.push({ "cliente.telefone": { $regex: escaparRegex(digitos) } });
    filtro.$or = ou;
  }

  if (filtros.eventoId) {
    if (!ObjectId.isValid(filtros.eventoId)) return [];
    filtro.eventoId = new ObjectId(filtros.eventoId);
  }

  return pedidos.find(filtro).sort({ criadoEm: -1 }).limit(LIMITE_LISTA_PEDIDOS_EVENTO).toArray();
}

export function serializarPedidoEvento(pedido: PedidoEvento): PedidoEventoJson {
  return {
    _id: pedido._id,
    eventoId: pedido.eventoId.toString(),
    evento: pedido.evento,
    cliente: pedido.cliente,
    itens: pedido.itens,
    valorCentavos: pedido.valorCentavos,
    observacao: pedido.observacao,
    status: pedido.status,
    criadoPor: pedido.criadoPor,
    atualizadoPor: pedido.atualizadoPor,
    criadoEm: pedido.criadoEm.toISOString(),
    atualizadoEm: pedido.atualizadoEm.toISOString(),
  };
}
