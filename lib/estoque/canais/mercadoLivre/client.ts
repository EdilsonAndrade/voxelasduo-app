import type { CanalEstoqueClient } from "../tipos";
import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";

/** `Produto.preco` é armazenado em centavos; a API do Mercado Livre espera o valor na unidade da moeda (reais). */
export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

/**
 * Client real do Mercado Livre — atualiza `available_quantity` e `price` do
 * anúncio (research.md #6, estende #7 da Tarefa 5). Quando `descricao` é
 * informada (edição feita no admin — ver `sincronizarAnuncioProduto`),
 * também atualiza a descrição via `PUT /items/{id}/description` — o mesmo
 * recurso usado na criação (`anuncios.ts`), mas com PUT em vez de POST.
 */
export const mercadoLivreClient: CanalEstoqueClient = {
  async atualizarAnuncio(
    itemId: string,
    { quantidade, preco, descricao }: { quantidade: number; preco: number; descricao?: string }
  ): Promise<void> {
    const token = await obterAccessTokenValido();

    const resposta = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        available_quantity: quantidade,
        price: centavosParaReais(preco),
      }),
    });

    if (!resposta.ok) {
      throw await erroMercadoLivre(resposta, "Falha ao atualizar anúncio no Mercado Livre");
    }

    if (descricao === undefined) return;

    const respostaDescricao = await fetch(
      `https://api.mercadolibre.com/items/${itemId}/description`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plain_text: descricao }),
      }
    );

    if (!respostaDescricao.ok) {
      throw await erroMercadoLivre(
        respostaDescricao,
        "Falha ao atualizar descrição do anúncio no Mercado Livre"
      );
    }
  },
};
