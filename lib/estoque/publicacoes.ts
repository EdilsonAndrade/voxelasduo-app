import type { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  PUBLICACOES_CANAL_FALHAS_COLLECTION,
  type FalhaPublicacaoCanal,
  type OperacaoPublicacaoCanal,
} from "@/lib/models/publicacaoCanal";
import type { Canal } from "@/lib/models/estoqueSincronizacao";

let indicesGarantidos: Promise<void> | undefined;

async function colecaoPublicacoesFalhas() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<FalhaPublicacaoCanal>(PUBLICACOES_CANAL_FALHAS_COLLECTION);

  if (!indicesGarantidos) {
    indicesGarantidos = Promise.all([
      colecao.createIndex({ resolvidoEm: 1 }, { sparse: true }),
      colecao.createIndex({ produtoId: 1 }),
    ]).then(() => undefined);
  }
  await indicesGarantidos;

  return colecao;
}

/** Registra uma falha de criação/atualização de anúncio (FR-011) — sem retry automático, exige correção manual (research.md #9). */
export async function registrarFalhaPublicacao(
  produtoId: ObjectId,
  canal: Canal,
  operacao: OperacaoPublicacaoCanal,
  motivo: string
): Promise<void> {
  const colecao = await colecaoPublicacoesFalhas();
  await colecao.insertOne({
    produtoId,
    canal,
    operacao,
    motivo,
    criadoEm: new Date(),
  });
}

/** Falhas ainda não resolvidas, para consulta manual (`GET /api/anuncios/pendencias`, FR-011, SC-005). */
export async function listarFalhasPendentes(): Promise<FalhaPublicacaoCanal[]> {
  const colecao = await colecaoPublicacoesFalhas();
  return colecao.find({ resolvidoEm: { $exists: false } }).sort({ criadoEm: -1 }).toArray();
}
