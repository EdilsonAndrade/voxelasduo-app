import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  SINCRONIZACOES_ESTOQUE_COLLECTION,
  type Canal,
  type RegistroSincronizacaoEstoque,
} from "@/lib/models/estoqueSincronizacao";

/** Esgotadas estas tentativas, o item fica `"falhou"` até uma nova venda ou reprocessamento manual. */
const MAX_TENTATIVAS = 5;

/** Backoff exponencial curto: 1min, 5min, 30min, 2h, 6h (research.md #4). */
const BACKOFF_MS = [
  1 * 60 * 1000,
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
];

/** `tentativas` é a contagem já realizada (1 = primeira falha) — retorna o atraso até a próxima tentativa. */
export function calcularBackoff(tentativas: number): number {
  const indice = Math.min(tentativas - 1, BACKOFF_MS.length - 1);
  return BACKOFF_MS[Math.max(indice, 0)];
}

let indicesGarantidos: Promise<void> | undefined;

async function colecaoSincronizacoes() {
  const client = await getMongoClient();
  const colecao = client
    .db(DB_NAME)
    .collection<RegistroSincronizacaoEstoque>(SINCRONIZACOES_ESTOQUE_COLLECTION);

  if (!indicesGarantidos) {
    indicesGarantidos = Promise.all([
      colecao.createIndex({ status: 1, proximaTentativaEm: 1 }),
      colecao.createIndex({ produtoId: 1 }),
    ]).then(() => undefined);
  }
  await indicesGarantidos;

  return colecao;
}

/** Cria um item de fila `"pendente"`, pronto para a tentativa imediata do chamador. */
export async function criarPendencia(
  produtoId: ObjectId,
  pedidoId: ObjectId | undefined,
  canal: Canal,
  quantidade: number
): Promise<RegistroSincronizacaoEstoque> {
  const colecao = await colecaoSincronizacoes();
  const agora = new Date();
  const registro: RegistroSincronizacaoEstoque = {
    produtoId,
    pedidoId,
    canal,
    quantidade,
    status: "pendente",
    tentativas: 0,
    proximaTentativaEm: agora,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const resultado = await colecao.insertOne(registro);
  return { ...registro, _id: resultado.insertedId };
}

export async function marcarSincronizado(id: ObjectId): Promise<void> {
  const colecao = await colecaoSincronizacoes();
  await colecao.updateOne(
    { _id: id },
    { $set: { status: "sincronizado", atualizadoEm: new Date() } }
  );
}

/** Incrementa `tentativas`; agenda retry com backoff ou marca `"falhou"` no limite (research.md #4). */
export async function marcarFalha(id: ObjectId, erro: string): Promise<void> {
  const colecao = await colecaoSincronizacoes();
  const registro = await colecao.findOne({ _id: id });
  if (!registro) return;

  const tentativas = registro.tentativas + 1;
  const agora = new Date();

  if (tentativas >= MAX_TENTATIVAS) {
    await colecao.updateOne(
      { _id: id },
      { $set: { status: "falhou", tentativas, ultimoErro: erro, atualizadoEm: agora } }
    );
    return;
  }

  await colecao.updateOne(
    { _id: id },
    {
      $set: {
        status: "pendente",
        tentativas,
        ultimoErro: erro,
        proximaTentativaEm: new Date(agora.getTime() + calcularBackoff(tentativas)),
        atualizadoEm: agora,
      },
    }
  );
}

/** Itens `"pendente"` cuja `proximaTentativaEm` já passou — candidatos ao reprocessamento (`POST /api/estoque/sincronizar`). */
export async function listarElegiveisParaRetry(): Promise<RegistroSincronizacaoEstoque[]> {
  const colecao = await colecaoSincronizacoes();
  return colecao
    .find({ status: "pendente", proximaTentativaEm: { $lte: new Date() } })
    .toArray();
}

/** Pendências/falhas para consulta manual (`GET /api/estoque/pendencias`, FR-009/FR-010). */
export async function listarPendencias(): Promise<RegistroSincronizacaoEstoque[]> {
  const colecao = await colecaoSincronizacoes();
  return colecao
    .find({ status: { $in: ["pendente", "falhou"] } })
    .sort({ atualizadoEm: -1 })
    .toArray();
}
