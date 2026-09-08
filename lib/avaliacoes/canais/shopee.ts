import type { ClienteAvaliacoesCanal } from "./tipos";

/**
 * Stub até a aprovação do app na Shopee Open Platform (mesmo bloqueio já
 * documentado em `lib/estoque/canais/shopee.ts`, research.md #2). `importarAvaliacoesProduto`
 * só chama este client quando `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY`
 * estiverem configurados; até lá, o canal Shopee é ignorado silenciosamente
 * e este client nunca é invocado.
 *
 * TODO (quando aprovado): implementar `GET /api/v2/product/get_comment` da
 * Shopee Open Platform, assinado com HMAC (partner_id + api_path + timestamp
 * + partner_key), mantendo a mesma interface `ClienteAvaliacoesCanal`.
 */
async function buscarAvaliacoes(): Promise<never> {
  throw new Error(
    "Client de avaliações da Shopee ainda não implementado — app pendente de aprovação na Shopee Open Platform."
  );
}

export const shopeeAvaliacoesClient: ClienteAvaliacoesCanal = { buscarAvaliacoes };
