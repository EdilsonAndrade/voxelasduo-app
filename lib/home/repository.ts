import { ObjectId, type Filter, type UpdateFilter } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import {
  SECOES_HOME_COLLECTION,
  type SecaoCarrossel,
  type SecaoHome,
} from "@/lib/models/secaoHome";
import type { DadosSecaoHome } from "@/lib/home/validation";

const garantirIndices = criarGarantiaDeIndices();

/** Campos editáveis pelo formulário — os ausentes numa edição são removidos ($unset). */
const CAMPOS_EDITAVEIS = [
  "titulo",
  "subtitulo",
  "texto",
  "botao",
  "imagemDesktop",
  "imagemMobile",
  "alinhamentoHorizontal",
  "alinhamentoVertical",
  "corSubtitulo",
  "corTitulo",
  "corTexto",
  "linkVerTudo",
  "limite",
] as const;

export async function colecaoSecoesHome() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<SecaoHome>(SECOES_HOME_COLLECTION);

  await garantirIndices(() =>
    Promise.all([
      colecao.createIndex({ ordem: 1 }),
      colecao.createIndex({ tipo: 1, produtoIds: 1 }),
    ])
  );

  return colecao;
}

function idValido(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function listarSecoes(): Promise<SecaoHome[]> {
  const colecao = await colecaoSecoesHome();
  return colecao.find({}).sort({ ordem: 1, criadoEm: 1 }).toArray();
}

export async function listarSecoesAtivas(): Promise<SecaoHome[]> {
  const colecao = await colecaoSecoesHome();
  return colecao.find({ ativa: true }).sort({ ordem: 1, criadoEm: 1 }).toArray();
}

export async function listarCarrosseis(): Promise<SecaoCarrossel[]> {
  const colecao = await colecaoSecoesHome();
  const carrosseis = await colecao.find({ tipo: "carrossel" }).sort({ ordem: 1 }).toArray();
  return carrosseis as SecaoCarrossel[];
}

export async function buscarSecao(id: string): Promise<SecaoHome | null> {
  const _id = idValido(id);
  if (!_id) return null;
  const colecao = await colecaoSecoesHome();
  return colecao.findOne({ _id });
}

/** Seção nova vai para o fim da home. */
export async function criarSecao(dados: DadosSecaoHome): Promise<SecaoHome> {
  const colecao = await colecaoSecoesHome();
  const ultima = await colecao.find({}).sort({ ordem: -1 }).limit(1).next();
  const agora = new Date();

  const documento = {
    ...dados,
    ...(dados.tipo === "carrossel" ? { produtoIds: [] } : {}),
    ordem: ultima ? ultima.ordem + 1 : 0,
    criadoEm: agora,
    atualizadoEm: agora,
  } as unknown as SecaoHome;

  const resultado = await colecao.insertOne(documento);
  return { ...documento, _id: resultado.insertedId };
}

export async function atualizarSecao(id: string, dados: DadosSecaoHome): Promise<SecaoHome | null> {
  const _id = idValido(id);
  if (!_id) return null;
  const colecao = await colecaoSecoesHome();

  // `tipo` nunca muda — fica fora do $set para não permitir troca por payload.
  const { tipo: _tipo, ...campos } = dados;
  const remover: Record<string, ""> = Object.fromEntries(
    CAMPOS_EDITAVEIS.filter((campo) => !(campo in campos)).map((campo) => [campo, "" as const])
  );

  const atualizacao: UpdateFilter<SecaoHome> = {
    $set: { ...campos, atualizadoEm: new Date() } as Partial<SecaoHome>,
    ...(Object.keys(remover).length > 0 ? { $unset: remover } : {}),
  };

  return colecao.findOneAndUpdate({ _id }, atualizacao, { returnDocument: "after" });
}

export async function removerSecao(id: string): Promise<boolean> {
  const _id = idValido(id);
  if (!_id) return false;
  const colecao = await colecaoSecoesHome();
  const resultado = await colecao.deleteOne({ _id });
  return resultado.deletedCount === 1;
}

export class OrdemInvalidaError extends Error {}

/** Reordena todas as seções: `ids` precisa conter cada seção existente exatamente uma vez. */
export async function reordenarSecoes(ids: string[]): Promise<SecaoHome[]> {
  const colecao = await colecaoSecoesHome();
  const existentes = await colecao.find({}, { projection: { _id: 1 } }).toArray();
  const idsExistentes = new Set(existentes.map((s) => s._id!.toString()));

  if (
    ids.length !== idsExistentes.size ||
    new Set(ids).size !== ids.length ||
    !ids.every((id) => idsExistentes.has(id))
  ) {
    throw new OrdemInvalidaError("Envie todas as seções, sem repetir, para reordenar.");
  }

  const agora = new Date();
  await colecao.bulkWrite(
    ids.map((id, ordem) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { ordem, atualizadoEm: agora } },
      },
    }))
  );

  return listarSecoes();
}

function filtroCarrossel(_id: ObjectId): Filter<SecaoHome> {
  return { _id, tipo: "carrossel" } as Filter<SecaoHome>;
}

/** Substitui a lista (e a ordem) dos produtos do carrossel. */
export async function definirProdutosCarrossel(
  id: string,
  produtoIds: ObjectId[]
): Promise<SecaoHome | null> {
  const _id = idValido(id);
  if (!_id) return null;
  const colecao = await colecaoSecoesHome();
  return colecao.findOneAndUpdate(
    filtroCarrossel(_id),
    { $set: { produtoIds, atualizadoEm: new Date() } as Partial<SecaoHome> },
    { returnDocument: "after" }
  );
}

/** Idempotente — produto já marcado continua na mesma posição; novo entra no fim. */
export async function marcarProduto(id: string, produtoId: ObjectId): Promise<SecaoHome | null> {
  const _id = idValido(id);
  if (!_id) return null;
  const colecao = await colecaoSecoesHome();
  return colecao.findOneAndUpdate(
    filtroCarrossel(_id),
    {
      $addToSet: { produtoIds: produtoId },
      $set: { atualizadoEm: new Date() },
    } as UpdateFilter<SecaoHome>,
    { returnDocument: "after" }
  );
}

export async function desmarcarProduto(id: string, produtoId: ObjectId): Promise<SecaoHome | null> {
  const _id = idValido(id);
  if (!_id) return null;
  const colecao = await colecaoSecoesHome();
  return colecao.findOneAndUpdate(
    filtroCarrossel(_id),
    {
      $pull: { produtoIds: produtoId },
      $set: { atualizadoEm: new Date() },
    } as UpdateFilter<SecaoHome>,
    { returnDocument: "after" }
  );
}

/** Chamado ao excluir um produto — evita ids órfãos nos carrosséis. */
export async function removerProdutoDeTodosCarrosseis(produtoId: ObjectId): Promise<void> {
  const colecao = await colecaoSecoesHome();
  await colecao.updateMany(
    { tipo: "carrossel", produtoIds: produtoId } as Filter<SecaoHome>,
    { $pull: { produtoIds: produtoId } } as UpdateFilter<SecaoHome>
  );
}
