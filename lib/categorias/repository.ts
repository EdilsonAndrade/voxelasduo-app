import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import {
  CATEGORIAS_COLLECTION,
  CATEGORIAS_INICIAIS,
  SLUG_CATEGORIA_PADRAO,
  type Categoria,
  type CategoriaResumo,
} from "@/lib/models/categoria";
import { PRODUTOS_COLLECTION, type Produto } from "@/lib/models/produto";
import { moverProdutoDeCategoria } from "@/lib/produtos/repository";
import { FILTRO_PUBLICADO } from "@/lib/produtos/publicacao";
import { gerarSlug } from "@/lib/produtos/slug";

const garantirIndices = criarGarantiaDeIndices();

export class CategoriaEquivalenteError extends Error {
  constructor(public readonly existente: string) {
    super(`Já existe uma categoria equivalente: "${existente}".`);
  }
}

export class CategoriaPadraoError extends Error {
  constructor() {
    super("A categoria Diversos não pode ser removida.");
  }
}

export class OrdemCategoriasInvalidaError extends Error {
  constructor() {
    super("Envie todas as categorias, sem repetir, na nova ordem.");
  }
}

export async function colecaoCategorias() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Categoria>(CATEGORIAS_COLLECTION);

  await garantirIndices(() =>
    Promise.all([
      colecao.createIndex({ slug: 1 }, { unique: true }),
      colecao.createIndex({ aliases: 1 }),
      colecao.createIndex({ ordem: 1 }),
    ])
  );

  return colecao;
}

async function colecaoProdutos() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<Produto>(PRODUTOS_COLLECTION);
}

/** Garante que "Diversos" exista mesmo antes da migração rodar (FR-003). Idempotente. */
export async function garantirCategoriaPadrao(): Promise<void> {
  const colecao = await colecaoCategorias();
  const padrao = CATEGORIAS_INICIAIS.find((c) => c.padrao)!;
  const agora = new Date();
  await colecao.updateOne(
    { slug: SLUG_CATEGORIA_PADRAO },
    {
      $setOnInsert: {
        nome: padrao.nome,
        slug: padrao.slug,
        padrao: true,
        ordem: CATEGORIAS_INICIAIS.length - 1,
        aliases: [],
        criadoEm: agora,
        atualizadoEm: agora,
      },
    },
    { upsert: true }
  );
}

export async function listarCategoriasCadastradas(): Promise<Categoria[]> {
  await garantirCategoriaPadrao();
  const colecao = await colecaoCategorias();
  return colecao.find({}).sort({ ordem: 1, criadoEm: 1 }).toArray();
}

/** Formato enxuto `{slug, nome}` de todas as categorias, na ordem — para os seletores do admin. */
export async function listarCategoriasResumo(): Promise<CategoriaResumo[]> {
  const categorias = await listarCategoriasCadastradas();
  return categorias.map(({ slug, nome }) => ({ slug, nome }));
}

/** Mapa slug → nome, para exibir o nome da categoria onde o produto só guarda o slug. */
export async function mapaNomesCategorias(): Promise<Map<string, string>> {
  const categorias = await listarCategoriasCadastradas();
  return new Map(categorias.map((c) => [c.slug, c.nome]));
}

/** Nome de exibição de uma categoria; cai no próprio valor quando não há cadastro (ex.: dado legado antes da migração). */
export function nomeDaCategoria(mapa: Map<string, string>, slug: string): string {
  return mapa.get(slug) ?? slug;
}

/**
 * Categorias com ao menos um produto **publicado**, na ordem cadastrada —
 * filtros da vitrine (FR-012). Categoria que só tem rascunho não vira filtro,
 * senão o visitante clicaria nela e cairia numa lista vazia.
 */
export async function listarCategoriasComProdutos(): Promise<CategoriaResumo[]> {
  const [categorias, produtos] = await Promise.all([listarCategoriasCadastradas(), colecaoProdutos()]);
  const emUso = new Set(await produtos.distinct("categoria", FILTRO_PUBLICADO));
  return categorias.filter((c) => emUso.has(c.slug)).map(({ slug, nome }) => ({ slug, nome }));
}

export async function buscarCategoriaPorSlug(slug: string): Promise<Categoria | null> {
  const colecao = await colecaoCategorias();
  return colecao.findOne({ slug });
}

export async function slugCategoriaValido(slug: string): Promise<boolean> {
  if (slug === SLUG_CATEGORIA_PADRAO) return true;
  return (await buscarCategoriaPorSlug(slug)) !== null;
}

/**
 * Slug atual para um segmento de URL que não é slug cadastrado: alias
 * (texto livre legado, categoria removida) ou variação equivalente
 * ("Acessórios" → "acessorios"). `null` quando não há destino (FR-013).
 */
export async function resolverRedirecionamentoCategoria(segmento: string): Promise<string | null> {
  const colecao = await colecaoCategorias();
  const porAlias = await colecao.findOne({ aliases: segmento });
  if (porAlias) return porAlias.slug;

  const normalizado = gerarSlug(segmento);
  if (normalizado && normalizado !== segmento) {
    const equivalente = await colecao.findOne({ slug: normalizado });
    if (equivalente) return equivalente.slug;
  }
  return null;
}

/** Quantidade de produtos por slug de categoria. */
export async function contarProdutosPorCategoria(): Promise<Map<string, number>> {
  const produtos = await colecaoProdutos();
  const grupos = await produtos
    .aggregate<{ _id: string; total: number }>([{ $group: { _id: "$categoria", total: { $sum: 1 } } }])
    .toArray();
  return new Map(grupos.map((g) => [g._id, g.total]));
}

/** Linha da tela de categorias do admin (serializável). */
export interface CategoriaAdmin {
  id: string;
  nome: string;
  slug: string;
  padrao: boolean;
  totalProdutos: number;
}

export async function listarCategoriasAdmin(): Promise<CategoriaAdmin[]> {
  const [categorias, totais] = await Promise.all([listarCategoriasCadastradas(), contarProdutosPorCategoria()]);
  return categorias.map((c) => paraCategoriaAdmin(c, totais.get(c.slug) ?? 0));
}

export function paraCategoriaAdmin(categoria: Categoria, totalProdutos = 0): CategoriaAdmin {
  return {
    id: categoria._id!.toString(),
    nome: categoria.nome,
    slug: categoria.slug,
    padrao: categoria.padrao === true || categoria.slug === SLUG_CATEGORIA_PADRAO,
    totalProdutos,
  };
}

/** Rejeita um nome equivalente ao de outra categoria (mesmo slug). Aliases não contam: servem só para redirecionar. */
async function garantirSemEquivalente(slug: string, ignorarId?: ObjectId): Promise<void> {
  const colecao = await colecaoCategorias();
  const filtro: Record<string, unknown> = { slug };
  if (ignorarId) filtro._id = { $ne: ignorarId };
  const existente = await colecao.findOne(filtro);
  if (existente) throw new CategoriaEquivalenteError(existente.nome);
}

export async function criarCategoria(nome: string): Promise<Categoria> {
  const colecao = await colecaoCategorias();
  const nomeLimpo = nome.trim();
  const slug = gerarSlug(nomeLimpo);
  await garantirSemEquivalente(slug);

  const ultima = await colecao.find({}).sort({ ordem: -1 }).limit(1).next();
  const agora = new Date();
  const categoria: Categoria = {
    nome: nomeLimpo,
    slug,
    ordem: ultima ? ultima.ordem + 1 : 0,
    aliases: [],
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const resultado = await colecao.insertOne(categoria);
  // Uma categoria removida deixa o slug como alias de Diversos; recriá-la devolve o endereço à nova categoria.
  await colecao.updateMany({ aliases: slug }, { $pull: { aliases: slug } });
  return { ...categoria, _id: resultado.insertedId };
}

/** Renomeia só o nome exibido — o slug (e as URLs) não muda (research.md #2). */
export async function renomearCategoria(id: string, nome: string): Promise<Categoria | null> {
  if (!ObjectId.isValid(id)) return null;
  const objectId = new ObjectId(id);
  const nomeLimpo = nome.trim();
  await garantirSemEquivalente(gerarSlug(nomeLimpo), objectId);

  const colecao = await colecaoCategorias();
  return colecao.findOneAndUpdate(
    { _id: objectId },
    { $set: { nome: nomeLimpo, atualizadoEm: new Date() } },
    { returnDocument: "after" }
  );
}

export async function reordenarCategorias(ids: string[]): Promise<void> {
  const colecao = await colecaoCategorias();
  const existentes = await colecao.find({}, { projection: { _id: 1 } }).toArray();
  const idsExistentes = new Set(existentes.map((c) => c._id!.toString()));

  const semRepetir = new Set(ids);
  if (
    ids.length !== idsExistentes.size ||
    semRepetir.size !== ids.length ||
    !ids.every((id) => idsExistentes.has(id))
  ) {
    throw new OrdemCategoriasInvalidaError();
  }

  await colecao.bulkWrite(
    ids.map((id, ordem) => ({
      updateOne: { filter: { _id: new ObjectId(id) }, update: { $set: { ordem, atualizadoEm: new Date() } } },
    }))
  );
}

/**
 * Remove a categoria movendo seus produtos para "Diversos" (com
 * redirecionamento de cada endereço antigo) e transferindo o slug e os
 * aliases dela para Diversos, para `/produtos/<slug removido>` continuar
 * levando a algum lugar (FR-006, FR-013). `null` quando não existe.
 */
export async function removerCategoria(id: string): Promise<{ produtosMovidos: number } | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoCategorias();
  const categoria = await colecao.findOne({ _id: new ObjectId(id) });
  if (!categoria) return null;
  if (categoria.padrao || categoria.slug === SLUG_CATEGORIA_PADRAO) throw new CategoriaPadraoError();

  await garantirCategoriaPadrao();
  const produtos = await (await colecaoProdutos()).find({ categoria: categoria.slug }).toArray();
  for (const produto of produtos) {
    await moverProdutoDeCategoria(produto, SLUG_CATEGORIA_PADRAO);
  }

  await colecao.updateOne(
    { slug: SLUG_CATEGORIA_PADRAO },
    {
      $addToSet: { aliases: { $each: [categoria.slug, ...categoria.aliases] } },
      $set: { atualizadoEm: new Date() },
    }
  );
  await colecao.deleteOne({ _id: categoria._id });

  return { produtosMovidos: produtos.length };
}
