import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";

/**
 * Limite de tentativas de login (EDI-125, FR-033). Fica no MongoDB para
 * valer entre instâncias serverless — um contador em memória seria zerado a
 * cada instância nova. Depois de MAX_FALHAS erros na janela, o identificador
 * fica bloqueado até a janela expirar; um login certo zera o contador.
 */
export const TENTATIVAS_LOGIN_COLLECTION = "tentativasLogin";
export const MAX_FALHAS = 10;
export const JANELA_MS = 15 * 60 * 1000;

interface TentativaLogin {
  chave: string;
  falhas: number;
  janelaInicio: Date;
}

async function colecao() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<TentativaLogin>(TENTATIVAS_LOGIN_COLLECTION);
}

function janelaAtiva(registro: TentativaLogin | null, agora: Date): registro is TentativaLogin {
  return !!registro && agora.getTime() - registro.janelaInicio.getTime() < JANELA_MS;
}

export async function loginBloqueado(chave: string, agora = new Date()): Promise<boolean> {
  const registro = await (await colecao()).findOne({ chave });
  return janelaAtiva(registro, agora) && registro.falhas >= MAX_FALHAS;
}

export async function registrarFalhaLogin(chave: string, agora = new Date()): Promise<void> {
  const tentativas = await colecao();
  const registro = await tentativas.findOne({ chave });

  if (janelaAtiva(registro, agora)) {
    await tentativas.updateOne({ chave }, { $inc: { falhas: 1 } });
    return;
  }

  await tentativas.updateOne({ chave }, { $set: { falhas: 1, janelaInicio: agora } }, { upsert: true });
}

export async function limparFalhasLogin(chave: string): Promise<void> {
  await (await colecao()).deleteOne({ chave });
}
