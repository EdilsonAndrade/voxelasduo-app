export const TREND_CACHE_COLLECTION = "trend_cache";

/** Chave fixa do documento de tendências gerais do site (US2/EDI-107) — distinto de uma busca por termo. */
export const TREND_CACHE_GERAIS_ID = "__gerais__";

/**
 * Um item em destaque (mais vendido) dentro do ranking de uma categoria
 * (`GET /highlights/MLB/category/{id}`). O ranking mistura tipos — só
 * `PRODUCT` tem nome resolvível via `GET /products/{id}`; `ITEM` (bloqueado,
 * 403 mesmo com token — research.md #3) e `USER_PRODUCT` (não testado)
 * ficam sem `nome` (data-model.md).
 */
export interface ItemRankingCategoria {
  /** 1-based, ordem devolvida pelo Mercado Livre. */
  posicao: number;
  /** id do produto/item/user-product no Mercado Livre. */
  id: string;
  tipo: "PRODUCT" | "ITEM" | "USER_PRODUCT";
  /** Ausente quando não foi possível resolver (tipo ITEM/USER_PRODUCT) — estado válido, não erro. */
  nome?: string;
}

/** Um termo em alta no Mercado Livre no momento (`GET /trends/MLB`), sem relação com uma busca específica. */
export interface TendenciaGeral {
  termo: string;
  url: string;
}

interface TrendCacheBase {
  _id: string;
  obtidoEm: Date;
}

/** Resultado guardado de uma busca por termo (US1/US3/US4) — preço/link deliberadamente ausentes (ver spec, Ajuste de escopo). */
export interface TrendCacheBusca extends TrendCacheBase {
  tipo: "busca";
  categoriaId: string;
  categoriaNome?: string;
  ranking: ItemRankingCategoria[];
}

/** Resultado guardado das tendências gerais do site (US2), documento único em `_id: TREND_CACHE_GERAIS_ID`. */
export interface TrendCacheGerais extends TrendCacheBase {
  _id: typeof TREND_CACHE_GERAIS_ID;
  tipo: "gerais";
  termos: TendenciaGeral[];
}

export type TrendCacheDocumento = TrendCacheBusca | TrendCacheGerais;
