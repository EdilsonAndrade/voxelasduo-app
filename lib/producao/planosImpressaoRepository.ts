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
  await garantirIndices(async () => {
    // A primeira versão tinha índice único em `produtoId` para todos os
    // documentos; com planos avulsos (sem produto) ele vira parcial.
    await colecao.dropIndex("produtoId_1").catch(() => undefined);
    await colecao.createIndex(
      { produtoId: 1 },
      { unique: true, name: "produtoId_unico", partialFilterExpression: { produtoId: { $type: "string" } } }
    );
  });
  return colecao;
}

export interface PlanoComProduto extends PlanoImpressao {
  id: string;
  /** Nome do produto do catálogo, ou o nome do item avulso. */
  produtoNome: string;
  linkModelo3d?: string;
}

/**
 * Planos com o nome do produto, mais recentes primeiro. Plano ligado a produto
 * que não existe mais fica de fora (o catálogo é a fonte da verdade).
 */
export async function listarPlanos(): Promise<PlanoComProduto[]> {
  const colecao = await colecaoPlanos();
  const planos = await colecao.find().sort({ atualizadoEm: -1 }).toArray();
  const ids = planos.flatMap((p) => (p.produtoId && ObjectId.isValid(p.produtoId) ? [p.produtoId] : []));

  const porId = new Map<string, Pick<Produto, "nome" | "linkModelo3d">>();
  if (ids.length > 0) {
    const client = await getMongoClient();
    const produtos = await client
      .db(DB_NAME)
      .collection<Produto>(PRODUTOS_COLLECTION)
      .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { nome: 1, linkModelo3d: 1 } })
      .toArray();
    for (const produto of produtos) porId.set(produto._id!.toString(), produto);
  }

  return planos.flatMap((plano) => {
    const id = plano._id!.toString();
    if (!plano.produtoId) return [{ ...plano, id, produtoNome: plano.nome ?? "" }];
    const produto = porId.get(plano.produtoId);
    return produto
      ? [{ ...plano, id, produtoNome: produto.nome, ...(produto.linkModelo3d ? { linkModelo3d: produto.linkModelo3d } : {}) }]
      : [];
  });
}

export async function buscarPlano(id: string): Promise<PlanoImpressao | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoPlanos();
  return colecao.findOne({ _id: new ObjectId(id) });
}

export async function buscarPlanoDoProduto(produtoId: string): Promise<PlanoImpressao | null> {
  const colecao = await colecaoPlanos();
  return colecao.findOne({ produtoId });
}

/** `null` = o produto já está no menu (índice único). */
export async function criarPlano(
  origem: { produtoId: string } | { nome: string },
  itens: ItemImpressao[]
): Promise<PlanoImpressao | null> {
  const colecao = await colecaoPlanos();
  const agora = new Date();
  const plano: PlanoImpressao = { ...origem, itens, criadoEm: agora, atualizadoEm: agora };
  try {
    const { insertedId } = await colecao.insertOne(plano);
    return { ...plano, _id: insertedId };
  } catch (erro) {
    if ((erro as { code?: number }).code === 11000) return null;
    throw erro;
  }
}

/**
 * Importação da Produção: cria o plano do produto ou mescla pelo nome da parte.
 * `criado` diz qual dos dois aconteceu (201 × 200 na rota).
 */
export async function mesclarPlano(
  produtoId: string,
  itens: ItemImpressao[]
): Promise<{ plano: PlanoImpressao; criado: boolean }> {
  const existente = await buscarPlanoDoProduto(produtoId);
  if (!existente) {
    const criado = await criarPlano({ produtoId }, itens);
    if (criado) return { plano: criado, criado: true };
    // Outra requisição criou no meio do caminho: mescla sobre o que ela gravou.
    return mesclarPlano(produtoId, itens);
  }

  const atualizado = await atualizarPlano(existente._id!.toString(), { itens: mesclarItens(existente.itens, itens) });
  return { plano: atualizado ?? existente, criado: false };
}

/** Troca a lista de itens e, no plano avulso, o nome. */
export async function atualizarPlano(
  id: string,
  dados: { itens: ItemImpressao[]; nome?: string }
): Promise<PlanoImpressao | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoPlanos();
  return colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...dados, atualizadoEm: new Date() } },
    { returnDocument: "after" }
  );
}

/**
 * O item avulso virou produto: o plano passa a ser do produto. `"ocupado"` =
 * o produto já tem outro plano.
 */
export async function vincularProduto(
  id: string,
  produtoId: string
): Promise<PlanoImpressao | null | "ocupado"> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoPlanos();
  try {
    return await colecao.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { produtoId, atualizadoEm: new Date() }, $unset: { nome: "" } },
      { returnDocument: "after" }
    );
  } catch (erro) {
    if ((erro as { code?: number }).code === 11000) return "ocupado";
    throw erro;
  }
}

export async function excluirPlano(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const colecao = await colecaoPlanos();
  const { deletedCount } = await colecao.deleteOne({ _id: new ObjectId(id) });
  return deletedCount > 0;
}

/** Produto excluído do catálogo: o plano dele sai junto. */
export async function excluirPlanoDoProduto(produtoId: string): Promise<void> {
  const colecao = await colecaoPlanos();
  await colecao.deleteOne({ produtoId });
}
