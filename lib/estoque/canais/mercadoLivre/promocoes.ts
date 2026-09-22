import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";

const API = "https://api.mercadolibre.com";

/** Uma promoção do Mercado Livre para a qual o item é elegível — antes do veredito de margem (calculado na rota, T020). */
export interface PromocaoCandidata {
  promotionId: string;
  tipo: string;
  nome?: string;
  precoPromocionalCentavos: number;
}

interface CampanhaBruta {
  id: string;
  type: string;
  name?: string;
}

interface ListaOuResultados<T> {
  results?: T[];
}

interface ItemCampanhaBruto {
  id: string;
  /** O nome exato do campo de preço promocional não foi confirmado com dado real (research.md #4) — tenta os candidatos mais prováveis. */
  offer_price?: number;
  price?: number;
}

function paraLista<T>(corpo: T[] | ListaOuResultados<T>): T[] {
  return Array.isArray(corpo) ? corpo : (corpo.results ?? []);
}

function paraCentavos(valorReais: number): number {
  return Math.round(valorReais * 100);
}

/** Preço que a promoção exige para este item — `undefined` quando nenhum campo conhecido bate (item descartado, não quebra a lista). */
function precoPromocionalCentavos(item: ItemCampanhaBruto): number | undefined {
  if (typeof item.offer_price === "number") return paraCentavos(item.offer_price);
  if (typeof item.price === "number") return paraCentavos(item.price);
  return undefined;
}

/**
 * Promoções elegíveis do Mercado Livre para um item específico (EDI-108,
 * research.md #4) — usa só os dois recursos com reachability confirmada:
 * `GET /seller-promotions/promotions` (campanhas do vendedor) e, para cada
 * campanha, `GET /seller-promotions/promotions/{id}/items` (itens elegíveis
 * dela) — cruza pelo `itemId`. `/seller-promotions/candidates` (não
 * confirmado para este app/site) não é usado.
 */
export async function listarPromocoesElegiveis(
  itemId: string,
  sellerId: number
): Promise<PromocaoCandidata[]> {
  const token = await obterAccessTokenValido();
  const headers = { Authorization: `Bearer ${token}` };

  const respostaCampanhas = await fetch(
    `${API}/seller-promotions/promotions?app_version=v2&seller_id=${sellerId}`,
    { headers }
  );

  if (!respostaCampanhas.ok) {
    throw await erroMercadoLivre(
      respostaCampanhas,
      "Falha ao consultar as promoções do Mercado Livre"
    );
  }

  const corpoCampanhas = await respostaCampanhas.text();
  if (!corpoCampanhas) return []; // sem campanhas ativas — resposta vazia é um estado válido (research.md #4)

  const campanhas = paraLista(JSON.parse(corpoCampanhas) as CampanhaBruta[] | ListaOuResultados<CampanhaBruta>);

  const resultados = await Promise.all(
    campanhas.map(async (campanha): Promise<PromocaoCandidata | undefined> => {
      try {
        const respostaItens = await fetch(
          `${API}/seller-promotions/promotions/${encodeURIComponent(campanha.id)}/items` +
            `?promotion_type=${encodeURIComponent(campanha.type)}&app_version=v2`,
          { headers }
        );
        if (!respostaItens.ok) return undefined;

        const itens = paraLista(
          (await respostaItens.json()) as ItemCampanhaBruto[] | ListaOuResultados<ItemCampanhaBruto>
        );
        const item = itens.find((i) => i.id === itemId);
        if (!item) return undefined;

        const preco = precoPromocionalCentavos(item);
        if (preco === undefined) return undefined;

        return {
          promotionId: campanha.id,
          tipo: campanha.type,
          nome: campanha.name,
          precoPromocionalCentavos: preco,
        };
      } catch {
        // Uma campanha com formato inesperado é descartada, sem derrubar as demais.
        return undefined;
      }
    })
  );

  return resultados.filter((r): r is PromocaoCandidata => r !== undefined);
}
