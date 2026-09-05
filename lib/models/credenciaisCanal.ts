export const CREDENCIAIS_CANAIS_COLLECTION = "credenciaisCanais";

/**
 * Tokens OAuth2 de um canal externo. `_id` é uma chave fixa por canal (não
 * `ObjectId`) — um único documento por canal. Usado hoje apenas pelo Mercado
 * Livre, cujo `refreshToken` é rotacionado a cada renovação (research.md #7).
 */
export interface CredencialCanal {
  _id: "mercado_livre";
  accessToken: string;
  refreshToken: string;
  expiraEm: Date;
  atualizadoEm: Date;
}
