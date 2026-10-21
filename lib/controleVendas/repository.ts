import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import { sincronizarAnuncioProduto } from "@/lib/estoque/sincronizacao";
import {
  CONTROLE_VENDAS_COLLECTION,
  type ControleVendas,
  type ItemControleJson,
  type ProducaoControlePayload,
  type VendaControle,
  type VendaControlePayload,
} from "@/lib/models/controleVendas";
import type { Produto } from "@/lib/models/produto";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import {
  buscarProdutoPorId,
  elevarEstoque,
  incrementarEstoque,
  listarProdutos,
  reduzirEstoqueAteZero,
} from "@/lib/produtos/repository";
import { estoqueAposProducao } from "./calculo";

const garantirIndices = criarGarantiaDeIndices();

async function colecaoControle() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<ControleVendas>(CONTROLE_VENDAS_COLLECTION);
  await garantirIndices(() => colecao.createIndex({ produtoId: 1 }, { unique: true }));
  return colecao;
}

function custoCadastro(produto: Produto): number | null {
  if (!produto.custoProducao) return null;
  const total = calcularCustoProducao(produto.custoProducao).totalCentavos;
  return Number.isFinite(total) ? Math.round(total) : null;
}

function montarItem(produto: Produto, controle: ControleVendas | null): ItemControleJson {
  return {
    produtoId: produto._id!.toString(),
    nome: produto.nome,
    foto: produto.fotos[0] ?? null,
    estoque: produto.estoque,
    precoSiteCentavos: produto.preco,
    custoCadastroCentavos: custoCadastro(produto),
    produzido: controle?.produzido ?? 0,
    custoUnitarioCentavos: controle?.custoUnitarioCentavos ?? null,
    precoVendaCentavos: controle?.precoVendaCentavos ?? null,
    vendas: (controle?.vendas ?? []).map((v) => ({ ...v, data: v.data.toISOString() })),
  };
}

export async function listarItensControle(): Promise<ItemControleJson[]> {
  const [produtos, colecao] = await Promise.all([listarProdutos(), colecaoControle()]);
  const controles = await colecao.find({}).toArray();
  const porProduto = new Map(controles.map((c) => [c.produtoId.toString(), c]));
  return produtos
    .map((p) => montarItem(p, porProduto.get(p._id!.toString()) ?? null))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

async function itemAtual(produtoId: string): Promise<ItemControleJson | null> {
  const produto = await buscarProdutoPorId(produtoId);
  if (!produto) return null;
  const colecao = await colecaoControle();
  return montarItem(produto, await colecao.findOne({ produtoId: new ObjectId(produtoId) }));
}

/** Leva o estoque novo aos canais com anúncio — nunca derruba a operação. */
async function sincronizar(produtoId: string): Promise<void> {
  await sincronizarAnuncioProduto(produtoId, undefined).catch(() => undefined);
}

async function documentoOuNovo(produtoId: string): Promise<ControleVendas> {
  const colecao = await colecaoControle();
  const _produtoId = new ObjectId(produtoId);
  const agora = new Date();
  const doc = await colecao.findOneAndUpdate(
    { produtoId: _produtoId },
    { $setOnInsert: { produtoId: _produtoId, produzido: 0, vendas: [], criadoEm: agora, atualizadoEm: agora } },
    { upsert: true, returnDocument: "after" }
  );
  return doc!;
}

/** `null` = produto não existe. */
export async function salvarProducao(
  produtoId: string,
  dados: ProducaoControlePayload
): Promise<ItemControleJson | null> {
  const produto = await buscarProdutoPorId(produtoId);
  if (!produto) return null;

  const doc = await documentoOuNovo(produtoId);
  const colecao = await colecaoControle();
  const $set: Partial<ControleVendas> = { produzido: dados.produzido, atualizadoEm: new Date() };
  const $unset: Record<string, ""> = {};
  if (dados.custoUnitarioCentavos === null) $unset.custoUnitarioCentavos = "";
  else $set.custoUnitarioCentavos = dados.custoUnitarioCentavos;
  if (dados.precoVendaCentavos === null) $unset.precoVendaCentavos = "";
  else $set.precoVendaCentavos = dados.precoVendaCentavos;
  await colecao.updateOne({ _id: doc._id }, { $set, ...(Object.keys($unset).length ? { $unset } : {}) });

  const vendidos = doc.vendas.reduce((t, v) => t + v.quantidade, 0);
  const alvo = estoqueAposProducao(produto.estoque, dados.produzido, vendidos);
  if (alvo > produto.estoque && (await elevarEstoque(produtoId, alvo))) await sincronizar(produtoId);

  return itemAtual(produtoId);
}

function montarVenda(id: string, dados: VendaControlePayload, quantidadeBaixada: number): VendaControle {
  return {
    id,
    data: new Date(dados.data),
    quantidade: dados.quantidade,
    cliente: dados.cliente.trim(),
    canal: dados.canal,
    precoUnitarioCentavos: dados.precoUnitarioCentavos,
    taxaPercentual: dados.taxaPercentual,
    taxaFixaCentavos: dados.taxaFixaCentavos,
    extrasCentavos: dados.extrasCentavos,
    baixarEstoque: dados.baixarEstoque,
    quantidadeBaixada,
  };
}

async function baixar(produtoId: string, dados: VendaControlePayload): Promise<number> {
  if (!dados.baixarEstoque) return 0;
  return (await reduzirEstoqueAteZero(produtoId, dados.quantidade)) ?? 0;
}

export async function adicionarVenda(
  produtoId: string,
  dados: VendaControlePayload
): Promise<ItemControleJson | null> {
  if (!(await buscarProdutoPorId(produtoId))) return null;

  const doc = await documentoOuNovo(produtoId);
  const baixada = await baixar(produtoId, dados);
  const colecao = await colecaoControle();
  await colecao.updateOne(
    { _id: doc._id },
    { $push: { vendas: montarVenda(randomUUID(), dados, baixada) }, $set: { atualizadoEm: new Date() } }
  );
  if (baixada > 0) await sincronizar(produtoId);
  return itemAtual(produtoId);
}

/** `null` = produto ou venda não existe. */
export async function atualizarVenda(
  produtoId: string,
  vendaId: string,
  dados: VendaControlePayload
): Promise<ItemControleJson | null> {
  if (!ObjectId.isValid(produtoId)) return null;
  const colecao = await colecaoControle();
  const doc = await colecao.findOne({ produtoId: new ObjectId(produtoId) });
  const anterior = doc?.vendas.find((v) => v.id === vendaId);
  if (!doc || !anterior) return null;

  // Devolve o que a versão anterior tirou e baixa de novo pela versão nova.
  if (anterior.quantidadeBaixada > 0) await incrementarEstoque(produtoId, anterior.quantidadeBaixada);
  const baixada = await baixar(produtoId, dados);

  await colecao.updateOne(
    { _id: doc._id, "vendas.id": vendaId },
    { $set: { "vendas.$": montarVenda(vendaId, dados, baixada), atualizadoEm: new Date() } }
  );
  if (anterior.quantidadeBaixada !== baixada) await sincronizar(produtoId);
  return itemAtual(produtoId);
}

/** `null` = produto ou venda não existe. */
export async function removerVenda(produtoId: string, vendaId: string): Promise<ItemControleJson | null> {
  if (!ObjectId.isValid(produtoId)) return null;
  const colecao = await colecaoControle();
  const doc = await colecao.findOne({ produtoId: new ObjectId(produtoId) });
  const venda = doc?.vendas.find((v) => v.id === vendaId);
  if (!doc || !venda) return null;

  await colecao.updateOne(
    { _id: doc._id },
    { $pull: { vendas: { id: vendaId } }, $set: { atualizadoEm: new Date() } }
  );
  if (venda.quantidadeBaixada > 0) {
    await incrementarEstoque(produtoId, venda.quantidadeBaixada);
    await sincronizar(produtoId);
  }
  return itemAtual(produtoId);
}
