import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";

export interface ReclamacaoDetalheMercadoLivre {
  reclamacaoId: string;
  /** id do pedido no Mercado Livre — casado com `origemExterna.pedidoExternoId` de `Pedido` (research.md #6). */
  pedidoExternoId?: string;
  motivo: string;
  aberta: boolean;
}

interface ClaimMercadoLivreResponse {
  id: number;
  resource_id?: string;
  type?: string;
  reason?: string;
  status: string;
}

/**
 * Busca os dados reais de uma reclamação do Mercado Livre
 * (`GET /post-purchase/v1/claims/{id}` — o endpoint `/v1/claims/` antigo foi
 * descontinuado em maio/2024, research.md #2). Mesmo princípio de
 * "payload é só o gatilho" já usado pelo webhook de pedidos.
 */
export async function buscarReclamacaoMercadoLivre(
  reclamacaoId: string
): Promise<ReclamacaoDetalheMercadoLivre> {
  const token = await obterAccessTokenValido();

  const resposta = await fetch(
    `https://api.mercadolibre.com/post-purchase/v1/claims/${reclamacaoId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao consultar reclamação no Mercado Livre");
  }

  const dados = (await resposta.json()) as ClaimMercadoLivreResponse;
  return {
    reclamacaoId: String(dados.id),
    pedidoExternoId: dados.resource_id,
    motivo: dados.reason ?? dados.type ?? "Não especificado",
    aberta: dados.status !== "closed",
  };
}

/**
 * Publica uma resposta/comentário numa reclamação. Cobre apenas o caso de
 * responder/comentar — ações estruturadas (mediação, reembolso, etc.)
 * continuam sendo feitas no portal do Mercado Livre (Assumptions do spec.md).
 * NOTA (research.md #2): validar o corpo exato contra uma reclamação de teste
 * antes de considerar esta função pronta para produção.
 */
export async function responderReclamacaoMercadoLivre(
  reclamacaoId: string,
  texto: string
): Promise<void> {
  const token = await obterAccessTokenValido();

  const resposta = await fetch(
    `https://api.mercadolibre.com/post-purchase/v1/claims/${reclamacaoId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: texto }),
    }
  );

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao responder reclamação no Mercado Livre");
  }
}
