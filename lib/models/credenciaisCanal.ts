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

export const CREDENCIAL_BAMBU_ID = "bambu_lab";

/**
 * Acesso à nuvem da Bambu Lab (EDI-127), na mesma coleção de credenciais de
 * serviço externo. Não há `refreshToken` útil: a API não oficial responde 401
 * no endpoint de renovação, então o token vale ~3 meses e a reconexão é
 * manual, feita pelo vendedor no painel (research.md #1).
 */
export interface CredencialBambuLab {
  _id: typeof CREDENCIAL_BAMBU_ID;
  accessToken: string;
  /**
   * Identificador do usuário na nuvem. É o mesmo número que a impressora
   * mostra em Configurações → Conta (`user_<userId>`) — serve para conferir
   * se o admin lê a conta em que a impressora está vinculada, e também será
   * usado na fase de tempo real (MQTT).
   */
  userId?: string;
  /** Nome de exibição da conta, quando a origem informa. */
  nomeUsuario?: string;
  /** Estimado em emissão + 90 dias, já que a origem não informa a validade. */
  expiraEm: Date;
  /**
   * Primeira conexão. Impressão que terminou antes disso é histórico e nunca
   * oferece lançamento de estoque — preservado nas reconexões seguintes
   * (research.md #6).
   */
  ativadoEm: Date;
  atualizadoEm: Date;
}

/** Estado derivado da credencial, nunca persistido. */
export type EstadoConexao = "ausente" | "ativa" | "expirada";
