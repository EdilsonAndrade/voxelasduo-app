import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { CREDENCIAIS_CANAIS_COLLECTION, type CredencialCanal } from "@/lib/models/credenciaisCanal";

/** Renova um pouco antes de expirar, para nunca usar um token na borda da validade. */
const MARGEM_EXPIRACAO_MS = 5 * 60 * 1000;

async function colecaoCredenciais() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<CredencialCanal>(CREDENCIAIS_CANAIS_COLLECTION);
}

async function persistirCredencial(
  accessToken: string,
  refreshToken: string,
  expiresInSegundos: number
): Promise<void> {
  const colecao = await colecaoCredenciais();
  const agora = new Date();
  await colecao.updateOne(
    { _id: "mercado_livre" },
    {
      $set: {
        accessToken,
        refreshToken,
        expiraEm: new Date(agora.getTime() + expiresInSegundos * 1000),
        atualizadoEm: agora,
      },
    },
    { upsert: true }
  );
}

/** Usado pela autorização inicial (quickstart.md) para gravar o primeiro par de tokens OAuth2. */
export async function salvarCredencialInicial(
  accessToken: string,
  refreshToken: string,
  expiresInSegundos: number
): Promise<void> {
  await persistirCredencial(accessToken, refreshToken, expiresInSegundos);
}

async function renovarToken(refreshToken: string): Promise<string> {
  const resposta = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.MERCADOLIVRE_CLIENT_ID ?? "",
      client_secret: process.env.MERCADOLIVRE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao renovar token do Mercado Livre (HTTP ${resposta.status}).`);
  }

  // O Mercado Livre rotaciona o refresh_token a cada renovação — o anterior deixa de valer.
  const dados = (await resposta.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await persistirCredencial(dados.access_token, dados.refresh_token, dados.expires_in);
  return dados.access_token;
}

/**
 * Retorna um access token válido do Mercado Livre, renovando automaticamente
 * via `refreshToken` quando necessário (research.md #7).
 */
export async function obterAccessTokenValido(): Promise<string> {
  const colecao = await colecaoCredenciais();
  const credencial = await colecao.findOne({ _id: "mercado_livre" });

  if (!credencial) {
    throw new Error(
      "Nenhuma credencial do Mercado Livre encontrada em credenciaisCanais — execute a autorização inicial (ver quickstart.md)."
    );
  }

  if (credencial.expiraEm.getTime() - MARGEM_EXPIRACAO_MS > Date.now()) {
    return credencial.accessToken;
  }

  return renovarToken(credencial.refreshToken);
}
