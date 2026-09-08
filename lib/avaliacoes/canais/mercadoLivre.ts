import { obterAccessTokenValido } from "@/lib/estoque/canais/mercadoLivre/auth";
import { erroMercadoLivre } from "@/lib/estoque/canais/mercadoLivre/erros";
import type { AvaliacaoImportada, ClienteAvaliacoesCanal } from "./tipos";

interface ReviewMercadoLivre {
  id: number | string;
  rate: number;
  comment?: string | null;
  date_created: string;
}

interface ReviewsMercadoLivreResponse {
  reviews: ReviewMercadoLivre[];
}

/**
 * Busca as avaliações de um anúncio do Mercado Livre (`GET /reviews/item/{item_id}`,
 * research.md #1), autenticado com o mesmo access token OAuth2 já usado pela
 * sincronização de estoque/anúncios (Tarefa 5/7).
 */
async function buscarAvaliacoes(itemId: string): Promise<AvaliacaoImportada[]> {
  const token = await obterAccessTokenValido();

  const resposta = await fetch(`https://api.mercadolibre.com/reviews/item/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao buscar avaliações no Mercado Livre");
  }

  const dados = (await resposta.json()) as ReviewsMercadoLivreResponse;

  return dados.reviews.map((review) => ({
    avaliacaoIdCanal: String(review.id),
    nota: review.rate,
    comentario: review.comment ?? undefined,
    dataAvaliacao: new Date(review.date_created),
  }));
}

export const mercadoLivreAvaliacoesClient: ClienteAvaliacoesCanal = { buscarAvaliacoes };
