import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";

export interface PerguntaDetalheMercadoLivre {
  perguntaId: string;
  itemId: string;
  texto: string;
  /** `status` da API já vem como "ANSWERED"/"UNANSWERED"/etc. — só nos interessa se já tem resposta. */
  respondida: boolean;
}

interface QuestionMercadoLivreResponse {
  id: number;
  item_id: string;
  text: string;
  status: string;
  answer?: { text: string } | null;
}

/**
 * Busca os dados reais de uma pergunta do Mercado Livre (`GET /questions/{id}`).
 * O webhook (tópico `questions`) só entrega o gatilho — o texto e o status
 * vêm sempre desta consulta autenticada, mesmo princípio já usado pelo
 * webhook de pedidos (research.md #1).
 */
export async function buscarPerguntaMercadoLivre(
  perguntaId: string
): Promise<PerguntaDetalheMercadoLivre> {
  const token = await obterAccessTokenValido();

  const resposta = await fetch(`https://api.mercadolibre.com/questions/${perguntaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao consultar pergunta no Mercado Livre");
  }

  const dados = (await resposta.json()) as QuestionMercadoLivreResponse;
  return {
    perguntaId: String(dados.id),
    itemId: dados.item_id,
    texto: dados.text,
    respondida: dados.status === "ANSWERED" || Boolean(dados.answer),
  };
}

/**
 * Publica uma resposta para uma pergunta (`POST /answers`, research.md #1).
 * Limite de 2000 caracteres imposto pela própria API do Mercado Livre.
 */
export async function responderPerguntaMercadoLivre(
  perguntaId: string,
  texto: string
): Promise<void> {
  const token = await obterAccessTokenValido();

  const resposta = await fetch("https://api.mercadolibre.com/answers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question_id: Number(perguntaId), text: texto }),
  });

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao responder pergunta no Mercado Livre");
  }
}
