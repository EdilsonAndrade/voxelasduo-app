import { MongoServerError, ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { AVALIACOES_COLLECTION, type Avaliacao, type CanalAvaliacao } from "@/lib/models/avaliacao";

const LIMITE_PADRAO = 10;
const LIMITE_MAXIMO = 50;

let indicesGarantidos: Promise<void> | undefined;

async function colecaoAvaliacoes() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Avaliacao>(AVALIACOES_COLLECTION);

  if (!indicesGarantidos) {
    indicesGarantidos = Promise.all([
      colecao.createIndex(
        { canal: 1, avaliacaoIdCanal: 1 },
        { unique: true, sparse: true }
      ),
      colecao.createIndex({ produtoId: 1, dataAvaliacao: -1 }),
    ]).then(() => undefined);
  }
  await indicesGarantidos;

  return colecao;
}

export interface DadosAvaliacaoImportada {
  produtoId: ObjectId;
  canal: CanalAvaliacao;
  avaliacaoIdCanal: string;
  nota: number;
  comentario?: string;
  dataAvaliacao: Date;
}

export interface ResultadoUpsertAvaliacao {
  criada: boolean;
  /** `true` só quando o conteúdo (nota/comentário/data) de uma avaliação já existente mudou (FR-004) — reimportação sem mudança não conta como atualização. */
  atualizada: boolean;
}

/**
 * Upsert idempotente por `{ canal, avaliacaoIdCanal }` — cobre FR-003 (sem
 * duplicar em reexecuções) e FR-004 (atualiza quando o conteúdo mudou no
 * canal de origem). Find-then-insert com catch do erro 11000 do índice único
 * (research.md #3), mesmo padrão já usado em `lib/pedidos/externos.ts`
 * (Tarefa 7) — mais direto que `updateOne`/`upsert` para também detectar
 * "sem mudança" e evitar contar reimportações idênticas como atualização.
 */
export async function upsertAvaliacao(
  dados: DadosAvaliacaoImportada
): Promise<ResultadoUpsertAvaliacao> {
  const colecao = await colecaoAvaliacoes();
  const agora = new Date();

  const existente = await colecao.findOne({
    canal: dados.canal,
    avaliacaoIdCanal: dados.avaliacaoIdCanal,
  });

  if (!existente) {
    try {
      await colecao.insertOne({
        produtoId: dados.produtoId,
        canal: dados.canal,
        avaliacaoIdCanal: dados.avaliacaoIdCanal,
        nota: dados.nota,
        comentario: dados.comentario,
        dataAvaliacao: dados.dataAvaliacao,
        criadoEm: agora,
        atualizadoEm: agora,
      });
      return { criada: true, atualizada: false };
    } catch (erro) {
      if (erro instanceof MongoServerError && erro.code === 11000) {
        // Corrida entre execuções concorrentes do job — outra já inseriu; nada a fazer aqui.
        return { criada: false, atualizada: false };
      }
      throw erro;
    }
  }

  const mudou =
    existente.nota !== dados.nota ||
    (existente.comentario ?? null) !== (dados.comentario ?? null) ||
    existente.dataAvaliacao.getTime() !== dados.dataAvaliacao.getTime();

  if (!mudou) {
    return { criada: false, atualizada: false };
  }

  await colecao.updateOne(
    { _id: existente._id },
    {
      $set: {
        nota: dados.nota,
        comentario: dados.comentario,
        dataAvaliacao: dados.dataAvaliacao,
        atualizadoEm: agora,
      },
    }
  );

  return { criada: false, atualizada: true };
}

export interface PaginaAvaliacoes {
  avaliacoes: Avaliacao[];
  proximoCursor: string | null;
}

function codificarCursor(avaliacao: Avaliacao): string {
  return Buffer.from(`${avaliacao.dataAvaliacao.toISOString()}_${avaliacao._id!.toString()}`).toString(
    "base64url"
  );
}

function decodificarCursor(cursor: string): { dataAvaliacao: Date; id: ObjectId } | null {
  try {
    const [iso, id] = Buffer.from(cursor, "base64url").toString("utf8").split("_");
    if (!iso || !id || !ObjectId.isValid(id)) return null;
    return { dataAvaliacao: new Date(iso), id: new ObjectId(id) };
  } catch {
    return null;
  }
}

/** Lista paginada por produto, mais recentes primeiro (FR-011, research.md #8). */
export async function buscarAvaliacoesProduto(
  produtoId: ObjectId,
  opcoes: { cursor?: string; limite?: number } = {}
): Promise<PaginaAvaliacoes> {
  const colecao = await colecaoAvaliacoes();
  const limite = Math.min(opcoes.limite ?? LIMITE_PADRAO, LIMITE_MAXIMO);

  const query: Record<string, unknown> = { produtoId };
  if (opcoes.cursor) {
    const decodificado = decodificarCursor(opcoes.cursor);
    if (decodificado) {
      query.$or = [
        { dataAvaliacao: { $lt: decodificado.dataAvaliacao } },
        { dataAvaliacao: decodificado.dataAvaliacao, _id: { $lt: decodificado.id } },
      ];
    }
  }

  const avaliacoes = await colecao
    .find(query)
    .sort({ dataAvaliacao: -1, _id: -1 })
    .limit(limite + 1)
    .toArray();

  const temMais = avaliacoes.length > limite;
  const pagina = temMais ? avaliacoes.slice(0, limite) : avaliacoes;
  const ultima = pagina.at(-1);

  return {
    avaliacoes: pagina,
    proximoCursor: temMais && ultima ? codificarCursor(ultima) : null,
  };
}
