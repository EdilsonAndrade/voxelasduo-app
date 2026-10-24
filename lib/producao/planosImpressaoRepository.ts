import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import {
  PLANOS_IMPRESSAO_COLLECTION,
  type ItemImpressao,
  type PlanoImpressao,
} from "@/lib/models/planoImpressao";
import { PRODUTOS_COLLECTION, type Produto } from "@/lib/models/produto";
import { mesclarItens } from "./planosImpressao";

const garantirIndices = criarGarantiaDeIndices();

async function colecaoPlanos() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<PlanoImpressao>(PLANOS_IMPRESSAO_COLLECTION);
  await garantirIndices(() => colecao.createIndex({ produtoId: 1 }, { unique: true }));
  return colecao;
}

export interface PlanoComProduto extends PlanoImpressao {
  produtoNome: string;
}

/**
 * Planos com o nome do produto, mais recentes primeiro. Plano de produto que
 * não existe mais fica de fora (o catálogo é a fonte da verdade).
 */
export async function listarPlanos(): Promise<PlanoComProduto[]> {
  const colecao = await colecaoPlanos();
  const planos = await colecao.find().sort({ atualizadoEm: -1 }).toArray();
  const ids = planos.map((p) => p.produtoId).filter((id) => ObjectId.isValid(id));
  if (ids.length === 0) return [];

  const client = await getMongoClient();
  const produtos = await client
    .db(DB_NAME)
    .collection<Produto>(PRODUTOS_COLLECTION)
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { nome: 1 } })
    .toArray();
  const nomes = new Map(produtos.map((p) => [p._id!.toString(), p.nome]));

  return planos.flatMap((plano) => {
    const produtoNome = nomes.get(plano.produtoId);
    return produtoNome === undefined ? [] : [{ ...plano, produtoNome }];
  });
}

export async function buscarPlano(produtoId: string): Promise<PlanoImpressao | null> {
  const colecao = await colecaoPlanos();
  return colecao.findOne({ produtoId });
}

/** `null` = o produto já está no menu (índice único). */
export async function criarPlano(produtoId: string, itens: ItemImpressao[]): Promise<PlanoImpressao | null> {
  const colecao = await colecaoPlanos();
  const agora = new Date();
  const plano: PlanoImpressao = { produtoId, itens, criadoEm: agora, atualizadoEm: agora };
  try {
    const { insertedId } = await colecao.insertOne(plano);
    return { ...plano, _id: insertedId };
  } catch (erro) {
    if ((erro as { code?: number }).code === 11000) return null;
    throw erro;
  }
}

/**
 * Importação da Produção: cria o plano ou mescla pelo nome da parte.
 * `criado` diz qual dos dois aconteceu (201 × 200 na rota).
 */
export async function mesclarPlano(
  produtoId: string,
  itens: ItemImpressao[]
): Promise<{ plano: PlanoImpressao; criado: boolean }> {
  const existente = await buscarPlano(produtoId);
  if (!existente) {
    const criado = await criarPlano(produtoId, itens);
    if (criado) return { plano: criado, criado: true };
    // Outra requisição criou no meio do caminho: mescla sobre o que ela gravou.
    return mesclarPlano(produtoId, itens);
  }

  const atualizado = await substituirItens(produtoId, mesclarItens(existente.itens, itens));
  return { plano: atualizado ?? existente, criado: false };
}

export async function substituirItens(produtoId: string, itens: ItemImpressao[]): Promise<PlanoImpressao | null> {
  const colecao = await colecaoPlanos();
  return colecao.findOneAndUpdate(
    { produtoId },
    { $set: { itens, atualizadoEm: new Date() } },
    { returnDocument: "after" }
  );
}

export async function excluirPlano(produtoId: string): Promise<boolean> {
  const colecao = await colecaoPlanos();
  const { deletedCount } = await colecao.deleteOne({ produtoId });
  return deletedCount > 0;
}
