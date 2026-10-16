export const TREND_CACHE_COLLECTION = "trend_cache";

/**
 * Um item em destaque (mais vendido) dentro do ranking de uma categoria
 * (`GET /highlights/MLB/category/{id}`). O ranking mistura tipos — só
 * `PRODUCT` tem nome e foto resolvíveis via `GET /products/{id}`; `ITEM` e
 * `USER_PRODUCT` de terceiros dão 403 (specs/033 research #1).
 */
export interface ItemRankingCategoria {
  /** 1-based, ordem devolvida pelo Mercado Livre. */
  posicao: number;
  /** id do produto/item/user-product no Mercado Livre. */
  id: string;
  tipo: "PRODUCT" | "ITEM" | "USER_PRODUCT";
}

/** Um termo em alta no Mercado Livre (`GET /trends/MLB/{categoryId}`). */
export interface TendenciaGeral {
  termo: string;
  url: string;
}

/** Produto de catálogo do ML (`/products/{id}` ou `/products/search`). */
export interface ProdutoCatalogo {
  id: string;
  nome?: string;
  foto?: string;
  dominioId?: string;
}
