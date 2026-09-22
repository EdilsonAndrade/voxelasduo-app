import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { TREND_CACHE_COLLECTION } from "@/lib/models/trendCache";

const TTL_MS = 24 * 60 * 60 * 1000;

/** Mesmo termo com maiúsculas/espaços diferentes cai na mesma entrada de cache (edge case da spec). */
export function normalizarTermo(termo: string): string {
  return termo.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Erro definitivo (não transitório, ex.: categoria não encontrada) — nunca
 * deve cair no fallback de cache vencido (US4, T018); a rota mapeia
 * diretamente para o status apropriado (research.md #6).
 */
export class ErroNaoEncontrado extends Error {}

export interface ResultadoComCache<T> {
  dados: T;
  origem: "novo" | "cache";
  obtidoEm: Date;
  avisoDesatualizado: boolean;
}

interface DocumentoArmazenado {
  _id: string;
  obtidoEm: Date;
  [campo: string]: unknown;
}

async function colecaoTrendCache() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<DocumentoArmazenado>(TREND_CACHE_COLLECTION);
}

function semMetadados<T>(documento: DocumentoArmazenado): T {
  const { _id, obtidoEm, ...resto } = documento;
  void _id;
  void obtidoEm;
  return resto as T;
}

/**
 * TTL de 24h — reaproveitado tanto pela busca por termo (US1/US3) quanto
 * pelas tendências gerais (US2/US3), research.md #5. `buscarNovo` só é
 * chamado quando não há cache vigente (ou `forcar: true`) e deve devolver o
 * documento completo (sem `_id`/`obtidoEm`, preenchidos aqui). Numa falha de
 * `buscarNovo` (disponibilidade/limite do Mercado Livre), se existir um
 * documento em cache — mesmo vencido — ele é devolvido com
 * `avisoDesatualizado: true` em vez do erro (US4); um `ErroNaoEncontrado`
 * nunca usa esse fallback (não é uma falha transitória) e um erro sem
 * nenhum documento em cache é propagado para a rota decidir o status
 * (research.md #6).
 */
export async function obterComCache<T extends Record<string, unknown>>(opcoes: {
  chave: string;
  forcar?: boolean;
  buscarNovo: () => Promise<T>;
}): Promise<ResultadoComCache<T>> {
  const { chave, forcar = false, buscarNovo } = opcoes;
  const colecao = await colecaoTrendCache();
  const documento = await colecao.findOne({ _id: chave });

  const vigente = !!documento && Date.now() - documento.obtidoEm.getTime() < TTL_MS;

  if (documento && vigente && !forcar) {
    return {
      dados: semMetadados<T>(documento),
      origem: "cache",
      obtidoEm: documento.obtidoEm,
      avisoDesatualizado: false,
    };
  }

  try {
    const dados = await buscarNovo();
    const obtidoEm = new Date();
    await colecao.updateOne({ _id: chave }, { $set: { ...dados, obtidoEm } }, { upsert: true });
    return { dados, origem: "novo", obtidoEm, avisoDesatualizado: false };
  } catch (erro) {
    if (erro instanceof ErroNaoEncontrado || !documento) {
      throw erro;
    }
    return {
      dados: semMetadados<T>(documento),
      origem: "cache",
      obtidoEm: documento.obtidoEm,
      avisoDesatualizado: true,
    };
  }
}
