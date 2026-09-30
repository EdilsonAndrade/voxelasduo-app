import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import { removerProdutoDeTodosCarrosseis } from "@/lib/home/repository";
import {
  registrarRedirecionamentoProduto,
  removerRedirecionamentosDoProduto,
} from "@/lib/categorias/redirecionamentos";
import { PRODUTOS_COLLECTION, type Produto } from "@/lib/models/produto";

const garantirIndices = criarGarantiaDeIndices();

async function colecaoProdutos() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Produto>(PRODUTOS_COLLECTION);

  // Garante os índices uma única vez por instância (idempotente no MongoDB).
  await garantirIndices(() =>
    Promise.all([
      colecao.createIndex({ categoria: 1, slug: 1 }, { unique: true }),
      colecao.createIndex({ categoria: 1 }),
    ])
  );

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

export async function buscarProdutoPorId(id: string): Promise<Produto | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoProdutos();
  return colecao.findOne({ _id: new ObjectId(id) });
}

/** Busca reversa anúncio → produto, usada pelo webhook de pedidos do Mercado Livre (Tarefa 7/EDI-80). */
/** Busca vários produtos de uma vez (carrosséis da home, EDI-114) — ids inexistentes são simplesmente ignorados. */
export async function listarProdutosPorIds(ids: ObjectId[]): Promise<Produto[]> {
  if (ids.length === 0) return [];
  const colecao = await colecaoProdutos();
  return colecao.find({ _id: { $in: ids } }).toArray();
}

export async function buscarProdutoPorMercadoLivreId(itemId: string): Promise<Produto | null> {
  const colecao = await colecaoProdutos();
  return colecao.findOne({ "integracoes.mercadoLivreId": itemId });
}

/** Produtos com anúncio em pelo menos um canal externo, usada pelo job de importação de avaliações (Tarefa 11/EDI-85). */
export async function listarProdutosComIntegracaoExterna(): Promise<Produto[]> {
  const colecao = await colecaoProdutos();
  return colecao
    .find({
      $or: [
        { "integracoes.mercadoLivreId": { $exists: true } },
        { "integracoes.shopeeItemId": { $exists: true } },
      ],
    })
    .toArray();
}

/** Produtos marcados para o catálogo da Meta (Facebook/Instagram Shop), usada pelo feed `/api/feeds/meta` (EDI-109). */
export async function listarProdutosPublicadosMeta(): Promise<Produto[]> {
  const colecao = await colecaoProdutos();
  return colecao.find({ "metaCatalogo.publicar": true }).sort({ criadoEm: -1 }).toArray();
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

/** Slug disponível na categoria: o próprio `slugBase` ou ele com sufixo curto, mesmo critério usado na criação do produto. */
export async function slugLivreNaCategoria(
  categoria: string,
  slugBase: string,
  ignorarId?: string
): Promise<string> {
  if (await slugDisponivel(categoria, slugBase, ignorarId)) return slugBase;
  return `${slugBase}-${Date.now().toString(36)}`;
}

/**
 * Muda a categoria (e o slug, quando `novoSlugBase` é informado) de um
 * produto, resolvendo conflito de slug no destino e registrando o endereço
 * antigo para redirecionar ao novo (EDI-123). Retorna o produto atualizado.
 */
export async function moverProdutoDeCategoria(
  produto: Produto,
  novaCategoria: string,
  novoSlugBase: string = produto.slug
): Promise<Produto | null> {
  if (novaCategoria === produto.categoria && novoSlugBase === produto.slug) return produto;

  const id = produto._id!.toString();
  const slug = await slugLivreNaCategoria(novaCategoria, novoSlugBase, id);
  const atualizado = await atualizarProduto(id, { categoria: novaCategoria, slug });
  if (atualizado) {
    await registrarRedirecionamentoProduto(
      { categoria: produto.categoria, slug: produto.slug },
      { categoria: novaCategoria, slug },
      produto._id!
    );
  }
  return atualizado;
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
  // Sem isso o id ficaria órfão nos carrosséis da home (EDI-114) e nos redirecionamentos (EDI-123).
  if (resultado) {
    await Promise.all([
      removerProdutoDeTodosCarrosseis(resultado._id),
      removerRedirecionamentosDoProduto(resultado._id),
    ]);
  }
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
