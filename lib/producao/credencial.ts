import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  CREDENCIAIS_CANAIS_COLLECTION,
  CREDENCIAL_BAMBU_ID,
  type CredencialBambuLab,
  type EstadoConexao,
} from "@/lib/models/credenciaisCanal";

/** Validade assumida do token: a origem não informa, a prática é ~3 meses (research.md #1). */
export const DIAS_VALIDADE_TOKEN = 90;

async function colecao() {
  const client = await getMongoClient();
  return client
    .db(DB_NAME)
    .collection<CredencialBambuLab>(CREDENCIAIS_CANAIS_COLLECTION);
}

export async function buscarCredencialBambu(): Promise<CredencialBambuLab | null> {
  const c = await colecao();
  return c.findOne({ _id: CREDENCIAL_BAMBU_ID });
}

/** Função pura: o estado que o painel mostra, derivado da credencial guardada. */
export function estadoDaConexao(
  credencial: CredencialBambuLab | null,
  agora: Date = new Date()
): EstadoConexao {
  if (!credencial) return "ausente";
  return credencial.expiraEm.getTime() <= agora.getTime() ? "expirada" : "ativa";
}

export function calcularExpiracao(agora: Date = new Date()): Date {
  return new Date(agora.getTime() + DIAS_VALIDADE_TOKEN * 24 * 60 * 60 * 1000);
}

/**
 * Grava o acesso recém-obtido. `ativadoEm` é preservado nas reconexões: ele
 * define o que é histórico, e perdê-lo passaria a oferecer lançamento de
 * estoque para impressões antigas (research.md #6).
 */
export async function salvarCredencialBambu(dados: {
  accessToken: string;
  userId?: string;
  nomeUsuario?: string;
}): Promise<CredencialBambuLab> {
  const c = await colecao();
  const agora = new Date();
  const existente = await c.findOne({ _id: CREDENCIAL_BAMBU_ID });

  const credencial: CredencialBambuLab = {
    _id: CREDENCIAL_BAMBU_ID,
    accessToken: dados.accessToken,
    userId: dados.userId ?? existente?.userId,
    nomeUsuario: dados.nomeUsuario ?? existente?.nomeUsuario,
    expiraEm: calcularExpiracao(agora),
    ativadoEm: existente?.ativadoEm ?? agora,
    atualizadoEm: agora,
  };

  await c.replaceOne({ _id: CREDENCIAL_BAMBU_ID }, credencial, { upsert: true });
  return credencial;
}

/** Remove o acesso guardado — as impressões já importadas permanecem. */
export async function removerCredencialBambu(): Promise<void> {
  const c = await colecao();
  await c.deleteOne({ _id: CREDENCIAL_BAMBU_ID });
}
