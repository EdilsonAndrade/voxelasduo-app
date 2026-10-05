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
 * Grava as impressões, criando as novas e **atualizando** os dados vindos da
 * origem nas que já existem.
 *
 * A separação importa: uma impressão importada enquanto ainda rodava chega
 * como `em_andamento`, sem hora de término; quando ela acaba, a origem passa
 * a informar resultado, fim e consumo reais, e esses campos precisam ser
 * atualizados. Já o que é **nosso** — quanto foi lançado no estoque, quanto
 * virou perda, se é histórico — vai em `$setOnInsert` e nunca é sobrescrito,
 * senão uma reimportação zeraria lançamentos já feitos.
 */
export async function inserirImpressoesNovas(
  impressoes: Impressao[]
): Promise<{ novas: number; ignoradas: number }> {
  if (impressoes.length === 0) return { novas: 0, ignoradas: 0 };

  const colecao = await colecaoImpressoes();
  const resultado = await colecao.bulkWrite(
    impressoes.map((impressao) => {
      const { quantidadeLancada, quantidadePerdida, historico, importadoEm, ...daOrigem } =
        impressao;

      return {
        updateOne: {
          filter: { taskId: impressao.taskId },
          update: {
            $set: daOrigem,
            $setOnInsert: { quantidadeLancada, quantidadePerdida, historico, importadoEm },
          },
          upsert: true,
        },
      };
    }),
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

/**
 * Impressões que têm miniatura na origem mas ainda não têm cópia nossa. O
 * limite existe porque cada uma custa um download e um upload: a importação
 * copia um lote por execução e as demais entram na seguinte.
 */
export async function listarSemMiniaturaPropria(limite = 40): Promise<Impressao[]> {
  const colecao = await colecaoImpressoes();
  return colecao
    .find({ coverUrl: { $exists: true, $ne: "" }, miniaturaUrl: { $exists: false } })
    .sort({ inicio: -1 })
    .limit(limite)
    .toArray();
}

/** Quantas impressões ainda dependem da URL da origem, que expira em 30 min. */
export async function contarSemMiniaturaPropria(): Promise<number> {
  const colecao = await colecaoImpressoes();
  return colecao.countDocuments({
    coverUrl: { $exists: true, $ne: "" },
    miniaturaUrl: { $exists: false },
  });
}

export async function definirMiniaturaPropria(
  taskId: string,
  miniaturaUrl: string
): Promise<void> {
  const colecao = await colecaoImpressoes();
  await colecao.updateOne({ taskId }, { $set: { miniaturaUrl } });
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
  {
    nomeArquivo: string;
    impressoes: number;
    gramasTotal: number;
    ultimaEm: Date;
    coverUrl?: string;
  }[]
> {
  const [impressoes, vinculos] = await Promise.all([colecaoImpressoes(), colecaoVinculos()]);
  const nomesVinculados = await vinculos.distinct("nomeArquivo");

  return impressoes
    .aggregate<{
      nomeArquivo: string;
      impressoes: number;
      gramasTotal: number;
      ultimaEm: Date;
      coverUrl?: string;
    }>([
      { $match: { nomeArquivo: { $nin: nomesVinculados } } },
      // Ordenado antes do agrupamento para que `$last` seja a impressão mais
      // recente — é a miniatura que ajuda a reconhecer a peça.
      { $sort: { inicio: 1 } },
      {
        $group: {
          _id: "$nomeArquivo",
          impressoes: { $sum: 1 },
          gramasTotal: { $sum: { $ifNull: ["$gramas", 0] } },
          ultimaEm: { $max: "$inicio" },
          coverUrl: { $last: { $ifNull: ["$miniaturaUrl", "$coverUrl"] } },
        },
      },
      {
        $project: {
          _id: 0,
          nomeArquivo: "$_id",
          impressoes: 1,
          gramasTotal: 1,
          ultimaEm: 1,
          coverUrl: 1,
        },
      },
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
  dados: {
    novas: number;
    ignoradas: number;
    paginas: number;
    totalNaOrigem?: number;
    miniaturasCopiadas?: number;
    erro?: string;
  }
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
