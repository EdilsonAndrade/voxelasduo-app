import type { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  AVALIACOES_IMPORTACAO_FALHAS_COLLECTION,
  type FalhaImportacaoAvaliacao,
} from "@/lib/models/avaliacaoImportacaoFalha";
import type { Canal } from "@/lib/models/estoqueSincronizacao";

let indicesGarantidos: Promise<void> | undefined;

async function colecaoFalhas() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<FalhaImportacaoAvaliacao>(AVALIACOES_IMPORTACAO_FALHAS_COLLECTION);

  if (!indicesGarantidos) {
    indicesGarantidos = Promise.all([
      colecao.createIndex({ resolvidoEm: 1 }, { sparse: true }),
      colecao.createIndex({ produtoId: 1 }),
    ]).then(() => undefined);
  }
  await indicesGarantidos;

  return colecao;
}

/** Registra uma falha de importação de avaliações (FR-006) — sem retry automático, exige correção manual (research.md #6). */
export async function registrarFalhaImportacao(
  canal: Canal,
  motivo: string,
  produtoId?: ObjectId
): Promise<void> {
  const colecao = await colecaoFalhas();
  await colecao.insertOne({
    canal,
    produtoId,
    motivo,
    criadoEm: new Date(),
  });
}

/** Falhas ainda não resolvidas, para consulta manual (`GET /api/avaliacoes/pendencias`, FR-006, SC-005). */
export async function listarFalhasPendentes(): Promise<FalhaImportacaoAvaliacao[]> {
  const colecao = await colecaoFalhas();
  return colecao.find({ resolvidoEm: { $exists: false } }).sort({ criadoEm: -1 }).toArray();
}
