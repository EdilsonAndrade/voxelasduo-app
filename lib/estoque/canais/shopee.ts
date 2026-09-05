import type { CanalEstoqueClient } from "./tipos";

/**
 * Stub até a aprovação do app na Shopee Open Platform (perfil em análise —
 * ver spec.md, Assumptions). `sincronizarEstoqueProduto` só chama este client
 * quando `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY` estiverem configurados
 * (research.md #6, #8); até lá, o canal Shopee é ignorado silenciosamente e
 * este client nunca é invocado.
 *
 * TODO (quando aprovado): implementar a assinatura HMAC exigida pela Shopee
 * Open Platform (partner_id + api_path + timestamp + partner_key) em cada
 * requisição, mantendo a mesma interface `CanalEstoqueClient`.
 */
export const shopeeClient: CanalEstoqueClient = {
  async atualizarQuantidade(): Promise<void> {
    throw new Error(
      "Client da Shopee ainda não implementado — app pendente de aprovação na Shopee Open Platform."
    );
  },
};
