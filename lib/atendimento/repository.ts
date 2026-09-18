import { MongoServerError, ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  MENSAGENS_MERCADO_LIVRE_COLLECTION,
  PERGUNTAS_MERCADO_LIVRE_COLLECTION,
  RECLAMACOES_MERCADO_LIVRE_COLLECTION,
  type MensagemPosVendaMercadoLivre,
  type PerguntaMercadoLivre,
  type ReclamacaoMercadoLivre,
} from "@/lib/models/atendimento";
import { colecaoPedidos } from "@/lib/pedidos/repository";

let indicesPerguntasGarantidos: Promise<void> | undefined;
let indicesReclamacoesGarantidos: Promise<void> | undefined;
let indicesMensagensGarantidos: Promise<void> | undefined;

export async function colecaoPerguntasMercadoLivre() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<PerguntaMercadoLivre>(PERGUNTAS_MERCADO_LIVRE_COLLECTION);

  if (!indicesPerguntasGarantidos) {
    indicesPerguntasGarantidos = colecao
      .createIndex({ perguntaId: 1 }, { unique: true, sparse: true })
      .then(() => undefined);
  }
  await indicesPerguntasGarantidos;

  return colecao;
}

export async function colecaoReclamacoesMercadoLivre() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<ReclamacaoMercadoLivre>(RECLAMACOES_MERCADO_LIVRE_COLLECTION);

  if (!indicesReclamacoesGarantidos) {
    indicesReclamacoesGarantidos = colecao
      .createIndex({ reclamacaoId: 1 }, { unique: true, sparse: true })
      .then(() => undefined);
  }
  await indicesReclamacoesGarantidos;

  return colecao;
}

export async function colecaoMensagensMercadoLivre() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<MensagemPosVendaMercadoLivre>(MENSAGENS_MERCADO_LIVRE_COLLECTION);

  if (!indicesMensagensGarantidos) {
    indicesMensagensGarantidos = colecao
      .createIndex({ mensagemId: 1 }, { unique: true, sparse: true })
      .then(() => undefined);
  }
  await indicesMensagensGarantidos;

  return colecao;
}

/** Resolve o `_id` do pedido do site a partir do id do pedido no Mercado Livre (research.md #6). */
async function buscarPedidoIdPorOrigemExterna(pedidoExternoId?: string): Promise<ObjectId | undefined> {
  if (!pedidoExternoId) return undefined;
  const colecao = await colecaoPedidos();
  const pedido = await colecao.findOne(
    { "origemExterna.pedidoExternoId": pedidoExternoId },
    { projection: { _id: 1 } }
  );
  return pedido?._id;
}

export interface UpsertPerguntaInput {
  perguntaId: string;
  itemId: string;
  produtoId?: ObjectId;
  texto: string;
  status: "pendente" | "respondida";
  linkOrigem: string;
}

/**
 * Upsert idempotente de uma pergunta (research.md #4): `$set` sempre reflete
 * o estado mais recente (permite a mesma pergunta evoluir de `pendente` para
 * `respondida` numa notificação seguinte — FR-014), com retry em caso de
 * corrida rara entre duas notificações quase simultâneas da mesma pergunta
 * nova (erro 11000 do índice único).
 */
export async function upsertPerguntaPendente(input: UpsertPerguntaInput): Promise<void> {
  const colecao = await colecaoPerguntasMercadoLivre();
  const agora = new Date();
  const atualizacao = {
    $set: {
      itemId: input.itemId,
      produtoId: input.produtoId,
      texto: input.texto,
      status: input.status,
      linkOrigem: input.linkOrigem,
      atualizadoEm: agora,
    },
    $setOnInsert: { perguntaId: input.perguntaId, criadoEm: agora },
  };

  try {
    await colecao.updateOne({ perguntaId: input.perguntaId }, atualizacao, { upsert: true });
  } catch (erro) {
    if (erro instanceof MongoServerError && erro.code === 11000) {
      await colecao.updateOne({ perguntaId: input.perguntaId }, atualizacao);
      return;
    }
    throw erro;
  }
}

export async function marcarPerguntaRespondida(perguntaId: string): Promise<void> {
  const colecao = await colecaoPerguntasMercadoLivre();
  await colecao.updateOne(
    { perguntaId },
    { $set: { status: "respondida", atualizadoEm: new Date() } }
  );
}

export async function listarPerguntasPendentes(): Promise<PerguntaMercadoLivre[]> {
  const colecao = await colecaoPerguntasMercadoLivre();
  return colecao.find({ status: "pendente" }).sort({ criadoEm: -1 }).toArray();
}

/** Busca pelo `_id` do Mongo (usado pela rota de resposta do admin, que recebe esse id na URL). */
export async function buscarPerguntaPorId(id: string): Promise<PerguntaMercadoLivre | null> {
  const colecao = await colecaoPerguntasMercadoLivre();
  return colecao.findOne({ _id: new ObjectId(id) });
}

export interface UpsertReclamacaoInput {
  reclamacaoId: string;
  pedidoExternoId?: string;
  motivo: string;
  status: "aberta" | "fechada";
  linkOrigem: string;
}

/** Mesmo padrão idempotente de `upsertPerguntaPendente` (research.md #4), com vínculo ao pedido (research.md #6). */
export async function upsertReclamacaoPendente(input: UpsertReclamacaoInput): Promise<void> {
  const colecao = await colecaoReclamacoesMercadoLivre();
  const agora = new Date();
  const pedidoId = await buscarPedidoIdPorOrigemExterna(input.pedidoExternoId);
  const atualizacao = {
    $set: {
      pedidoExternoId: input.pedidoExternoId,
      pedidoId,
      motivo: input.motivo,
      status: input.status,
      linkOrigem: input.linkOrigem,
      atualizadoEm: agora,
    },
    $setOnInsert: { reclamacaoId: input.reclamacaoId, criadoEm: agora },
  };

  try {
    await colecao.updateOne({ reclamacaoId: input.reclamacaoId }, atualizacao, { upsert: true });
  } catch (erro) {
    if (erro instanceof MongoServerError && erro.code === 11000) {
      await colecao.updateOne({ reclamacaoId: input.reclamacaoId }, atualizacao);
      return;
    }
    throw erro;
  }
}

export async function marcarReclamacaoFechada(reclamacaoId: string): Promise<void> {
  const colecao = await colecaoReclamacoesMercadoLivre();
  await colecao.updateOne(
    { reclamacaoId },
    { $set: { status: "fechada", atualizadoEm: new Date() } }
  );
}

export async function listarReclamacoesPendentes(): Promise<ReclamacaoMercadoLivre[]> {
  const colecao = await colecaoReclamacoesMercadoLivre();
  return colecao.find({ status: "aberta" }).sort({ criadoEm: -1 }).toArray();
}

/** Busca pelo `_id` do Mongo (usado pela rota de resposta do admin, que recebe esse id na URL). */
export async function buscarReclamacaoPorId(id: string): Promise<ReclamacaoMercadoLivre | null> {
  const colecao = await colecaoReclamacoesMercadoLivre();
  return colecao.findOne({ _id: new ObjectId(id) });
}

export interface UpsertMensagemInput {
  mensagemId: string;
  pedidoExternoId?: string;
  texto: string;
  status: "pendente" | "respondida";
  linkOrigem: string;
}

/** Mesmo padrão idempotente de `upsertPerguntaPendente` (research.md #4), com vínculo ao pedido (research.md #6). */
export async function upsertMensagemPendente(input: UpsertMensagemInput): Promise<void> {
  const colecao = await colecaoMensagensMercadoLivre();
  const agora = new Date();
  const pedidoId = await buscarPedidoIdPorOrigemExterna(input.pedidoExternoId);
  const atualizacao = {
    $set: {
      pedidoExternoId: input.pedidoExternoId,
      pedidoId,
      texto: input.texto,
      status: input.status,
      linkOrigem: input.linkOrigem,
      atualizadoEm: agora,
    },
    $setOnInsert: { mensagemId: input.mensagemId, criadoEm: agora },
  };

  try {
    await colecao.updateOne({ mensagemId: input.mensagemId }, atualizacao, { upsert: true });
  } catch (erro) {
    if (erro instanceof MongoServerError && erro.code === 11000) {
      await colecao.updateOne({ mensagemId: input.mensagemId }, atualizacao);
      return;
    }
    throw erro;
  }
}

export async function marcarMensagemRespondida(mensagemId: string): Promise<void> {
  const colecao = await colecaoMensagensMercadoLivre();
  await colecao.updateOne(
    { mensagemId },
    { $set: { status: "respondida", atualizadoEm: new Date() } }
  );
}

export async function listarMensagensPendentes(): Promise<MensagemPosVendaMercadoLivre[]> {
  const colecao = await colecaoMensagensMercadoLivre();
  return colecao.find({ status: "pendente" }).sort({ criadoEm: -1 }).toArray();
}

/** Busca pelo `_id` do Mongo (usado pela rota de resposta do admin, que recebe esse id na URL). */
export async function buscarMensagemPorId(id: string): Promise<MensagemPosVendaMercadoLivre | null> {
  const colecao = await colecaoMensagensMercadoLivre();
  return colecao.findOne({ _id: new ObjectId(id) });
}
