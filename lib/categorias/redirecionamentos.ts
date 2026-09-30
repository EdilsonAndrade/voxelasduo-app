import type { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import {
  REDIRECIONAMENTOS_PRODUTOS_COLLECTION,
  type RedirecionamentoProduto,
} from "@/lib/models/redirecionamentoProduto";

const garantirIndices = criarGarantiaDeIndices();

async function colecaoRedirecionamentos() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<RedirecionamentoProduto>(REDIRECIONAMENTOS_PRODUTOS_COLLECTION);

  await garantirIndices(() =>
    Promise.all([
      colecao.createIndex({ categoria: 1, slug: 1 }, { unique: true }),
      colecao.createIndex({ produtoId: 1 }),
    ])
  );

  return colecao;
}

export interface EnderecoProduto {
  categoria: string;
  slug: string;
}

/**
 * Registra que o endereço `antigo` passa a levar ao produto (EDI-123). Upsert:
 * se o mesmo endereço já apontava para outro produto, o mais recente vence.
 * Não grava nada quando o endereço não mudou.
 */
export async function registrarRedirecionamentoProduto(
  antigo: EnderecoProduto,
  novo: EnderecoProduto,
  produtoId: ObjectId
): Promise<void> {
  if (antigo.categoria === novo.categoria && antigo.slug === novo.slug) return;

  const colecao = await colecaoRedirecionamentos();
  await colecao.updateOne(
    { categoria: antigo.categoria, slug: antigo.slug },
    { $set: { produtoId, criadoEm: new Date() } },
    { upsert: true }
  );
}

/** Produto para o qual um endereço antigo deve levar, ou `null` quando não há redirecionamento. */
export async function buscarRedirecionamentoProduto(
  categoria: string,
  slug: string
): Promise<ObjectId | null> {
  const colecao = await colecaoRedirecionamentos();
  const redirecionamento = await colecao.findOne({ categoria, slug });
  return redirecionamento?.produtoId ?? null;
}

/** Remove os endereços antigos de um produto excluído — sem isso eles levariam a um 404 com um registro inútil. */
export async function removerRedirecionamentosDoProduto(produtoId: ObjectId): Promise<void> {
  const colecao = await colecaoRedirecionamentos();
  await colecao.deleteMany({ produtoId });
}
