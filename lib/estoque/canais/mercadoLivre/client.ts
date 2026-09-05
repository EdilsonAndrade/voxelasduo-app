import type { CanalEstoqueClient } from "../tipos";
import { obterAccessTokenValido } from "./auth";

/** Client real do Mercado Livre — atualiza `available_quantity` do anúncio (research.md #7). */
export const mercadoLivreClient: CanalEstoqueClient = {
  async atualizarQuantidade(itemId: string, quantidade: number): Promise<void> {
    const token = await obterAccessTokenValido();

    const resposta = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ available_quantity: quantidade }),
    });

    if (!resposta.ok) {
      throw new Error(`Falha ao atualizar estoque no Mercado Livre (HTTP ${resposta.status}).`);
    }
  },
};
