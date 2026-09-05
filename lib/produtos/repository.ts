import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { PRODUTOS_COLLECTION, type Produto } from "@/lib/models/produto";

let indicesGarantidos: Promise<void> | undefined;

async function colecaoProdutos() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Produto>(PRODUTOS_COLLECTION);

  // Garante os índices uma única vez por instância (idempotente no MongoDB).
  if (!indicesGarantidos) {
    indicesGarantidos = Promise.all([
      colecao.createIndex({ categoria: 1, slug: 1 }, { unique: true }),
      colecao.createIndex({ categoria: 1 }),
    ]).then(() => undefined);
  }
  await indicesGarantidos;

  return colecao;
}

export interface FiltroListagem {
  q?: string;
  categoria?: string;
}

function escapeRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listarProdutos(filtro: FiltroListagem = {}) {
  const colecao = await colecaoProdutos();
  const query: Record<string, unknown> = {};

  if (filtro.categoria) {
    query.categoria = filtro.categoria;
  }

  if (filtro.q) {
    const termo = escapeRegex(filtro.q.trim());
    query.$or = [
      { nome: { $regex: termo, $options: "i" } },
      { descricao: { $regex: termo, $options: "i" } },
    ];
  }

  return colecao.find(query).sort({ criadoEm: -1 }).toArray();
}

export async function listarCategorias(): Promise<string[]> {
  const colecao = await colecaoProdutos();
  const categorias = await colecao.distinct("categoria");
  return categorias.filter((c): c is string => typeof c === "string" && c.length > 0).sort();
}

export async function buscarProdutoPorId(id: string): Promise<Produto | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoProdutos();
  return colecao.findOne({ _id: new ObjectId(id) });
}

export async function buscarProdutoPorCategoriaESlug(
  categoria: string,
  slug: string
): Promise<Produto | null> {
  const colecao = await colecaoProdutos();
  return colecao.findOne({ categoria, slug });
}

export async function slugDisponivel(
  categoria: string,
  slug: string,
  ignorarId?: string
): Promise<boolean> {
  const colecao = await colecaoProdutos();
  const query: Record<string, unknown> = { categoria, slug };
  if (ignorarId && ObjectId.isValid(ignorarId)) {
    query._id = { $ne: new ObjectId(ignorarId) };
  }
  const existente = await colecao.findOne(query);
  return existente === null;
}

export type NovoProduto = Omit<Produto, "_id" | "criadoEm" | "atualizadoEm">;

export async function criarProduto(dados: NovoProduto): Promise<Produto> {
  const colecao = await colecaoProdutos();
  const agora = new Date();
  const produto: Produto = { ...dados, criadoEm: agora, atualizadoEm: agora };
  const resultado = await colecao.insertOne(produto);
  return { ...produto, _id: resultado.insertedId };
}

export type AtualizacaoProduto = Partial<Omit<Produto, "_id" | "criadoEm" | "atualizadoEm">>;

export async function atualizarProduto(
  id: string,
  dados: AtualizacaoProduto
): Promise<Produto | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoProdutos();
  const resultado = await colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...dados, atualizadoEm: new Date() } },
    { returnDocument: "after" }
  );
  return resultado ?? null;
}

export async function removerProduto(id: string): Promise<Produto | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoProdutos();
  const resultado = await colecao.findOneAndDelete({ _id: new ObjectId(id) });
  return resultado ?? null;
}

export interface ResultadoAbatimentoEstoque {
  sucesso: boolean;
  motivoFalha?: "estoque_insuficiente" | "produto_removido";
  produto?: Produto;
}

/**
 * Abate `quantidade` do estoque de forma atômica: `$inc` só é aplicado se
 * `estoque >= quantidade` no momento exato da operação — resolve corrida
 * entre vendas simultâneas do mesmo produto sem transação multi-documento
 * (research.md #2, Tarefa 5).
 */
export async function abaterEstoqueAtomico(
  id: string,
  quantidade: number
): Promise<ResultadoAbatimentoEstoque> {
  if (!ObjectId.isValid(id)) return { sucesso: false, motivoFalha: "produto_removido" };

  const colecao = await colecaoProdutos();
  const objectId = new ObjectId(id);

  const resultado = await colecao.findOneAndUpdate(
    { _id: objectId, estoque: { $gte: quantidade } },
    { $inc: { estoque: -quantidade }, $set: { atualizadoEm: new Date() } },
    { returnDocument: "after" }
  );

  if (resultado) {
    return { sucesso: true, produto: resultado };
  }

  const existente = await colecao.findOne({ _id: objectId });
  return {
    sucesso: false,
    motivoFalha: existente ? "estoque_insuficiente" : "produto_removido",
  };
}
