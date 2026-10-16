import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";
import type { ItemRankingCategoria, ProdutoCatalogo, TendenciaGeral } from "@/lib/models/trendCache";
import type { CategoriaNavegavel } from "@/lib/models/produtosAlta";

const API = "https://api.mercadolibre.com";

async function getMl<T>(caminho: string, contexto: string): Promise<T> {
  const token = await obterAccessTokenValido();
  const resposta = await fetch(`${API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, contexto);
  }

  return (await resposta.json()) as T;
}

interface HighlightResposta {
  content?: Array<{ id: string; position: number; type: string }>;
}

const TIPOS_RANKING = new Set(["PRODUCT", "ITEM", "USER_PRODUCT"]);

function tipoRanking(bruto: string): ItemRankingCategoria["tipo"] {
  return TIPOS_RANKING.has(bruto) ? (bruto as ItemRankingCategoria["tipo"]) : "ITEM";
}

/**
 * Ranking de mais vendido de uma categoria (`GET /highlights/MLB/category/{id}`,
 * `highlight_type: BEST_SELLER`) — só posição, id e tipo; nome e foto vêm de
 * `obterProdutoCatalogo`, guardado à parte por 7 dias (specs/033 research #6).
 */
export async function buscarMaisVendidosCategoria(categoryId: string): Promise<ItemRankingCategoria[]> {
  const corpo = await getMl<HighlightResposta>(
    `/highlights/MLB/category/${encodeURIComponent(categoryId)}`,
    "Falha ao consultar os mais vendidos no Mercado Livre"
  );

  return (corpo.content ?? []).map((item) => ({
    posicao: item.position,
    id: item.id,
    tipo: tipoRanking(item.type),
  }));
}

interface ProdutoBruto {
  id: string;
  name?: string;
  domain_id?: string;
  pictures?: Array<{ url?: string; secure_url?: string }>;
}

function produtoDoBruto(bruto: ProdutoBruto): ProdutoCatalogo {
  const foto = bruto.pictures?.[0]?.secure_url ?? bruto.pictures?.[0]?.url;
  return {
    id: bruto.id,
    nome: bruto.name,
    foto: foto?.replace(/^http:\/\//, "https://"),
    dominioId: bruto.domain_id,
  };
}

/** Nome e foto de um produto de catálogo (`GET /products/{id}`) — só para itens `PRODUCT`. */
export async function obterProdutoCatalogo(id: string): Promise<ProdutoCatalogo> {
  const bruto = await getMl<ProdutoBruto>(
    `/products/${encodeURIComponent(id)}`,
    "Falha ao consultar o produto no Mercado Livre"
  );
  return produtoDoBruto({ ...bruto, id: bruto.id ?? id });
}

interface TendenciaBruta {
  keyword: string;
  url: string;
}

/**
 * Termos mais buscados dentro de uma categoria (`GET /trends/MLB/{categoryId}`,
 * specs/030) — até 50, em ordem: a posição é o sinal de demanda.
 */
export async function buscarTendenciasCategoria(categoryId: string): Promise<TendenciaGeral[]> {
  const corpo = await getMl<TendenciaBruta[]>(
    `/trends/MLB/${encodeURIComponent(categoryId)}`,
    "Falha ao consultar as tendências da categoria no Mercado Livre"
  );
  return corpo.map((t) => ({ termo: t.keyword, url: t.url }));
}

interface BuscaCatalogoResposta {
  paging?: { total?: number };
  results?: ProdutoBruto[];
}

/**
 * Quantos produtos de catálogo o ML tem para um termo (`GET /products/search`,
 * `paging.total`) — proxy de concorrência, porque a contagem de anúncios
 * (`/sites/MLB/search`) é bloqueada para este app (specs/030 research #2).
 * O ML devolve no máximo 10000.
 */
export async function contarProdutosCatalogo(termo: string): Promise<number> {
  const params = new URLSearchParams({ status: "active", site_id: "MLB", q: termo, limit: "1" });
  const corpo = await getMl<BuscaCatalogoResposta>(
    `/products/search?${params}`,
    "Falha ao contar produtos de catálogo no Mercado Livre"
  );
  return corpo.paging?.total ?? 0;
}

/**
 * Produtos de catálogo para um termo, em ordem de relevância do ML. O filtro
 * `category` é ignorado pelo ML; para restringir use `dominioId`
 * (specs/033 research #5).
 */
export async function buscarProdutosCatalogo(
  termo: string,
  opcoes: { limite: number; dominioId?: string }
): Promise<ProdutoCatalogo[]> {
  const params = new URLSearchParams({ status: "active", site_id: "MLB", q: termo, limit: String(opcoes.limite) });
  if (opcoes.dominioId) params.set("domain_id", opcoes.dominioId);

  const corpo = await getMl<BuscaCatalogoResposta>(
    `/products/search?${params}`,
    "Falha ao buscar produtos no catálogo do Mercado Livre"
  );
  return (corpo.results ?? []).map(produtoDoBruto);
}

interface DominioBruto {
  domain_id: string;
  category_id: string;
}

/** Domínios (tipos de produto) e categorias sugeridos pelo ML para um termo (`domain_discovery`). */
export async function descobrirDominios(termo: string): Promise<Array<{ dominioId: string; categoriaId: string }>> {
  const params = new URLSearchParams({ q: termo, limit: "8" });
  const corpo = await getMl<DominioBruto[]>(
    `/sites/MLB/domain_discovery/search?${params}`,
    "Falha ao identificar o tipo de produto no Mercado Livre"
  );
  return corpo.map((d) => ({ dominioId: d.domain_id, categoriaId: d.category_id }));
}

interface CategoriaBruta {
  id: string;
  name: string;
  path_from_root?: Array<{ id: string; name: string }>;
  children_categories?: Array<{ id: string; name: string }>;
}

/** Categoria com o caminho desde a raiz e as filhas diretas (`GET /categories/{id}`). */
export async function obterCategoriaNavegavel(id: string): Promise<CategoriaNavegavel> {
  const bruta = await getMl<CategoriaBruta>(
    `/categories/${encodeURIComponent(id)}`,
    "Falha ao consultar a categoria no Mercado Livre"
  );
  return {
    id: bruta.id,
    nome: bruta.name,
    caminho: (bruta.path_from_root ?? []).map((c) => ({ id: c.id, nome: c.name })),
    filhas: (bruta.children_categories ?? []).map((c) => ({ id: c.id, nome: c.name })),
  };
}
