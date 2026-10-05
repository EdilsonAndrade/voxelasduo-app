import { ObjectId, type Filter } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  IMPORTACOES_PRODUCAO_COLLECTION,
  IMPRESSOES_COLLECTION,
  LANCAMENTOS_PRODUCAO_COLLECTION,
  VINCULOS_PRODUCAO_COLLECTION,
  type Impressao,
  type ImportacaoProducao,
  type LancamentoProducao,
  type OrigemImportacao,
  type ResultadoImpressao,
  type VinculoArquivoProduto,
} from "@/lib/models/producao";

async function colecaoImpressoes() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Impressao>(IMPRESSOES_COLLECTION);
  // `taskId` único é o que garante o dedupe entre importações (FR-007).
  await colecao.createIndex({ taskId: 1 }, { unique: true });
  await colecao.createIndex({ nomeArquivo: 1 });
  await colecao.createIndex({ inicio: -1 });
  await colecao.createIndex({ resultado: 1, inicio: -1 });
  return colecao;
}

async function colecaoVinculos() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<VinculoArquivoProduto>(VINCULOS_PRODUCAO_COLLECTION);
  await colecao.createIndex({ nomeArquivo: 1 }, { unique: true });
  await colecao.createIndex({ produtoId: 1 });
  return colecao;
}

async function colecaoLancamentos() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<LancamentoProducao>(LANCAMENTOS_PRODUCAO_COLLECTION);
  await colecao.createIndex({ produtoId: 1, criadoEm: -1 });
  await colecao.createIndex({ "consumo.impressaoId": 1 });
  return colecao;
}

async function colecaoImportacoes() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<ImportacaoProducao>(IMPORTACOES_PRODUCAO_COLLECTION);
  await colecao.createIndex({ iniciadoEm: -1 });
  return colecao;
}

// ---------------------------------------------------------------- impressões

/**
 * Grava as impressões novas, ignorando as que já existem. O `upsert` com
 * `$setOnInsert` é o que torna a importação repetível sem duplicar nem
 * sobrescrever `quantidadeLancada` de uma impressão já lançada no estoque.
 */
export async function inserirImpressoesNovas(
  impressoes: Impressao[]
): Promise<{ novas: number; ignoradas: number }> {
  if (impressoes.length === 0) return { novas: 0, ignoradas: 0 };

  const colecao = await colecaoImpressoes();
  const resultado = await colecao.bulkWrite(
    impressoes.map((impressao) => ({
      updateOne: {
        filter: { taskId: impressao.taskId },
        update: { $setOnInsert: impressao },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const novas = resultado.upsertedCount;
  return { novas, ignoradas: impressoes.length - novas };
}

export async function taskIdsExistentes(taskIds: string[]): Promise<Set<string>> {
  if (taskIds.length === 0) return new Set();
  const colecao = await colecaoImpressoes();
  const encontradas = await colecao
    .find({ taskId: { $in: taskIds } }, { projection: { taskId: 1 } })
    .toArray();
  return new Set(encontradas.map((i) => i.taskId));
}

export interface FiltroImpressoes {
  de?: Date;
  ate?: Date;
  nomeArquivo?: string | string[];
  impressoraId?: string;
  resultado?: ResultadoImpressao;
  pagina?: number;
  porPagina?: number;
}

function montarFiltro(filtro: FiltroImpressoes): Filter<Impressao> {
  const query: Filter<Impressao> = {};

  if (filtro.de || filtro.ate) {
    query.inicio = {
      ...(filtro.de ? { $gte: filtro.de } : {}),
      ...(filtro.ate ? { $lte: filtro.ate } : {}),
    };
  }
  if (filtro.nomeArquivo) {
    query.nomeArquivo = Array.isArray(filtro.nomeArquivo)
      ? { $in: filtro.nomeArquivo }
      : filtro.nomeArquivo;
  }
  if (filtro.impressoraId) query.impressoraId = filtro.impressoraId;
  if (filtro.resultado) query.resultado = filtro.resultado;

  return query;
}

export async function listarImpressoes(
  filtro: FiltroImpressoes = {}
): Promise<{ total: number; impressoes: Impressao[] }> {
  const colecao = await colecaoImpressoes();
  const query = montarFiltro(filtro);
  const porPagina = filtro.porPagina ?? 50;
  const pagina = filtro.pagina && filtro.pagina > 0 ? filtro.pagina : 1;

  const [total, impressoes] = await Promise.all([
    colecao.countDocuments(query),
    colecao
      .find(query)
      .sort({ inicio: -1 })
      .skip((pagina - 1) * porPagina)
      .limit(porPagina)
      .toArray(),
  ]);

  return { total, impressoes };
}

/** Todas as impressões de um conjunto de nomes de arquivo, sem paginar — base da apuração. */
export async function listarImpressoesPorNomes(nomes: string[]): Promise<Impressao[]> {
  if (nomes.length === 0) return [];
  const colecao = await colecaoImpressoes();
  return colecao.find({ nomeArquivo: { $in: nomes } }).sort({ inicio: 1 }).toArray();
}

export async function buscarImpressaoPorId(id: string): Promise<Impressao | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoImpressoes();
  return colecao.findOne({ _id: new ObjectId(id) });
}

/**
 * Nomes de arquivo sem vínculo, agrupados (FR-012). A exclusão usa a lista de
 * nomes já vinculados porque o vínculo vive em outra coleção — sem `$lookup`,
 * que seria desproporcional para o volume esperado.
 */
export async function agruparPendentes(): Promise<
  { nomeArquivo: string; impressoes: number; gramasTotal: number; ultimaEm: Date }[]
> {
  const [impressoes, vinculos] = await Promise.all([colecaoImpressoes(), colecaoVinculos()]);
  const nomesVinculados = await vinculos.distinct("nomeArquivo");

  return impressoes
    .aggregate<{ nomeArquivo: string; impressoes: number; gramasTotal: number; ultimaEm: Date }>([
      { $match: { nomeArquivo: { $nin: nomesVinculados } } },
      {
        $group: {
          _id: "$nomeArquivo",
          impressoes: { $sum: 1 },
          gramasTotal: { $sum: { $ifNull: ["$gramas", 0] } },
          ultimaEm: { $max: "$inicio" },
        },
      },
      { $project: { _id: 0, nomeArquivo: "$_id", impressoes: 1, gramasTotal: 1, ultimaEm: 1 } },
      { $sort: { ultimaEm: -1 } },
    ])
    .toArray();
}

/**
 * Consome `unidades` do saldo de uma impressão de forma atômica. A condição
 * vai no filtro — mesmo padrão de `abaterEstoqueAtomico` — então duas
 * chamadas simultâneas não conseguem lançar além do rendimento (FR-036).
 */
export async function consumirSaldoImpressao(
  impressaoId: ObjectId,
  unidades: number,
  perdidas: number,
  limite: number
): Promise<boolean> {
  const colecao = await colecaoImpressoes();
  const resultado = await colecao.findOneAndUpdate(
    {
      _id: impressaoId,
      quantidadeLancada: { $lte: limite - unidades - perdidas },
    },
    { $inc: { quantidadeLancada: unidades, quantidadePerdida: perdidas } },
    { returnDocument: "after" }
  );
  return resultado !== null;
}

// ------------------------------------------------------------------ vínculos

export async function listarVinculos(): Promise<VinculoArquivoProduto[]> {
  const colecao = await colecaoVinculos();
  return colecao.find().sort({ nomeArquivo: 1 }).toArray();
}

export async function listarVinculosDoProduto(
  produtoId: ObjectId
): Promise<VinculoArquivoProduto[]> {
  const colecao = await colecaoVinculos();
  return colecao.find({ produtoId }).sort({ parte: 1 }).toArray();
}

export async function buscarVinculoPorNome(
  nomeArquivo: string
): Promise<VinculoArquivoProduto | null> {
  const colecao = await colecaoVinculos();
  return colecao.findOne({ nomeArquivo });
}

export async function salvarVinculo(dados: {
  nomeArquivo: string;
  produtoId: ObjectId;
  parte: string;
  rendimentoPorPlaca: number;
  unidadesPorProduto: number;
}): Promise<VinculoArquivoProduto> {
  const colecao = await colecaoVinculos();
  const agora = new Date();

  const resultado = await colecao.findOneAndUpdate(
    { nomeArquivo: dados.nomeArquivo },
    {
      $set: {
        produtoId: dados.produtoId,
        parte: dados.parte,
        rendimentoPorPlaca: dados.rendimentoPorPlaca,
        unidadesPorProduto: dados.unidadesPorProduto,
        atualizadoEm: agora,
      },
      $setOnInsert: { nomeArquivo: dados.nomeArquivo, criadoEm: agora },
    },
    { upsert: true, returnDocument: "after" }
  );

  return resultado!;
}

export async function removerVinculo(nomeArquivo: string): Promise<boolean> {
  const colecao = await colecaoVinculos();
  const resultado = await colecao.deleteOne({ nomeArquivo });
  return resultado.deletedCount > 0;
}

// --------------------------------------------------------------- lançamentos

export async function registrarLancamento(
  lancamento: Omit<LancamentoProducao, "_id" | "criadoEm">
): Promise<LancamentoProducao> {
  const colecao = await colecaoLancamentos();
  const documento: LancamentoProducao = { ...lancamento, criadoEm: new Date() };
  const resultado = await colecao.insertOne(documento);
  return { ...documento, _id: resultado.insertedId };
}

// --------------------------------------------------------------- importações

export async function iniciarImportacao(origem: OrigemImportacao): Promise<ObjectId> {
  const colecao = await colecaoImportacoes();
  const resultado = await colecao.insertOne({
    origem,
    iniciadoEm: new Date(),
    novas: 0,
    ignoradas: 0,
    paginas: 0,
  });
  return resultado.insertedId;
}

export async function finalizarImportacao(
  id: ObjectId,
  dados: { novas: number; ignoradas: number; paginas: number; erro?: string }
): Promise<void> {
  const colecao = await colecaoImportacoes();
  await colecao.updateOne(
    { _id: id },
    { $set: { ...dados, terminadoEm: new Date() } }
  );
}

export async function listarImportacoes(limite = 5): Promise<ImportacaoProducao[]> {
  const colecao = await colecaoImportacoes();
  return colecao.find().sort({ iniciadoEm: -1 }).limit(limite).toArray();
}
