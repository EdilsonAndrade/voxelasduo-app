import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";
import { montarConsultaPrevisor, resolverCategoriaMercadoLivre } from "./categorias";
import { preverCategoriaMercadoLivre } from "./previsorCategoria";
import type { ComissaoMercadoLivre } from "@/lib/produtos/precificacao";

/**
 * Mesmo tipo de anúncio fixo usado na publicação real (`anuncios.ts`,
 * `LISTING_TYPE_ID`) — a simulação de comissão precisa refletir o que
 * realmente seria publicado (research.md #3).
 */
const LISTING_TYPE_ID = "gold_special";

interface ListingPriceResposta {
  listing_type_id: string;
  listing_fee_amount: number;
  sale_fee_amount: number;
  sale_fee_details: {
    fixed_fee: number;
    percentage_fee: number;
  };
}

function paraCentavos(valorReais: number): number {
  return Math.round(valorReais * 100);
}

/**
 * Consulta o custo real de venda no Mercado Livre para um preço/categoria
 * (research.md #1) — usa `GET /sites/MLB/listing_prices`, o único endpoint
 * que reflete a comissão real (não uma % fixa assumida). Sem parâmetros de
 * logística nesta primeira versão (research.md #3): o `percentage_fee` de
 * venda não depende deles, apenas o `fixed_fee` de frete pode ficar
 * impreciso.
 */
export async function consultarCustoVenda({
  categoryId,
  precoReais,
}: {
  categoryId: string;
  precoReais: number;
}): Promise<ComissaoMercadoLivre> {
  const token = await obterAccessTokenValido();

  const url =
    `https://api.mercadolibre.com/sites/MLB/listing_prices` +
    `?category_id=${encodeURIComponent(categoryId)}&price=${precoReais}&listing_type_id=${LISTING_TYPE_ID}`;

  const resposta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao consultar o custo de venda no Mercado Livre");
  }

  const corpo = (await resposta.json()) as ListingPriceResposta | ListingPriceResposta[];
  // A API retorna um objeto único quando category_id + price + listing_type_id
  // são enviados juntos, mas um array em algumas combinações de parâmetros —
  // tratamos os dois formatos por segurança (documentação "Custos por vender").
  const dados = Array.isArray(corpo)
    ? corpo.find((item) => item.listing_type_id === LISTING_TYPE_ID) ?? corpo[0]
    : corpo;

  if (!dados) {
    throw new Error("O Mercado Livre não retornou custos de venda para essa categoria/preço.");
  }

  return {
    categoryId,
    listingTypeId: dados.listing_type_id,
    listingFeeAmountCentavos: paraCentavos(dados.listing_fee_amount),
    saleFeeAmountCentavos: paraCentavos(dados.sale_fee_amount),
    percentageFee: dados.sale_fee_details.percentage_fee,
    fixedFeeCentavos: paraCentavos(dados.sale_fee_details.fixed_fee),
  };
}

/**
 * Resolve a categoria do Mercado Livre a usar na simulação de comissão,
 * antes de o produto ser publicado (research.md #2) — reaproveita
 * exatamente a mesma lógica de `criarAnuncio()` (`anuncios.ts`): override
 * manual (`resolverCategoriaMercadoLivre`) com fallback para o previsor
 * (`preverCategoriaMercadoLivre`), garantindo que a simulação não divirja da
 * categoria que seria usada numa publicação real.
 */
export async function resolverCategoriaParaSimulacao(
  nome: string,
  categoria: string
): Promise<string | undefined> {
  return (
    resolverCategoriaMercadoLivre(categoria) ??
    (await preverCategoriaMercadoLivre(montarConsultaPrevisor(categoria, nome)))
  );
}
