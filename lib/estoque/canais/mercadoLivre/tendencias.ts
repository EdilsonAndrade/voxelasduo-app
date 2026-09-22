import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";
import { preverCategoriaMercadoLivre } from "./previsorCategoria";
import { obterCategoria } from "./catalogoCategorias";
import type { ItemRankingCategoria, TendenciaGeral } from "@/lib/models/trendCache";

const API = "https://api.mercadolibre.com";

/**
 * Resolve a categoria do Mercado Livre a partir de um termo de busca livre
 * (EDI-107) — reaproveita o mesmo previsor usado no cadastro de produto
 * (`resolverCategoriaParaSimulacao`/`precos.ts`), mas sem a "categoria do
 * site" como segundo parâmetro: aqui a tela só tem um campo de busca
 * (research.md #2). Devolve `undefined` quando o previsor não encontra
 * nenhuma correspondência.
 */
export async function preverCategoriaParaTendencia(
  termo: string
): Promise<{ categoryId: string; categoriaNome?: string } | undefined> {
  const categoryId = await preverCategoriaMercadoLivre(termo);
  if (!categoryId) return undefined;

  // Nome legível é best-effort — a categoria já foi resolvida, então uma
  // falha aqui não deveria impedir a busca (o ranking segue útil só com o id).
  try {
    const { categoria } = await obterCategoria(categoryId);
    return { categoryId, categoriaNome: categoria.nome };
  } catch {
    return { categoryId };
  }
}

interface HighlightConteudo {
  id: string;
  position: number;
  type: string;
}

interface HighlightResposta {
  content?: HighlightConteudo[];
}

interface ProdutoCatalogoResposta {
  name?: string;
}

const TIPOS_RANKING = new Set(["PRODUCT", "ITEM", "USER_PRODUCT"]);

function tipoRanking(bruto: string): ItemRankingCategoria["tipo"] {
  return TIPOS_RANKING.has(bruto) ? (bruto as ItemRankingCategoria["tipo"]) : "ITEM";
}

/**
 * Nome do produto de catálogo (`GET /products/{id}`) — só funciona para
 * itens `type: "PRODUCT"`; `ITEM` de terceiro devolve 403 e `USER_PRODUCT`
 * não foi testado (research.md #3/#3b). Falha ao resolver o nome de um item
 * não deve derrubar o ranking inteiro — `nome` ausente é um estado válido.
 */
async function resolverNomeProduto(id: string, token: string): Promise<string | undefined> {
  try {
    const resposta = await fetch(`${API}/products/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resposta.ok) return undefined;
    const dados = (await resposta.json()) as ProdutoCatalogoResposta;
    return dados.name;
  } catch {
    return undefined;
  }
}

/**
 * Ranking de mais vendido de uma categoria (`GET /highlights/MLB/category/{id}`,
 * `highlight_type: BEST_SELLER`) — único sinal de popularidade por termo
 * acessível a este app; preço não está disponível (research.md #1/#3).
 */
export async function buscarMaisVendidosCategoria(
  categoryId: string
): Promise<ItemRankingCategoria[]> {
  const token = await obterAccessTokenValido();

  const resposta = await fetch(
    `${API}/highlights/MLB/category/${encodeURIComponent(categoryId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao consultar os mais vendidos no Mercado Livre");
  }

  const corpo = (await resposta.json()) as HighlightResposta;
  const conteudo = corpo.content ?? [];

  return Promise.all(
    conteudo.map(async (item) => {
      const tipo = tipoRanking(item.type);
      const nome = tipo === "PRODUCT" ? await resolverNomeProduto(item.id, token) : undefined;
      return { posicao: item.position, id: item.id, tipo, nome } satisfies ItemRankingCategoria;
    })
  );
}

interface TendenciaBruta {
  keyword: string;
  url: string;
}

/** Termos em alta no Mercado Livre no momento (`GET /trends/MLB`) — geral, não filtrado por termo (US2). */
export async function buscarTendenciasGerais(): Promise<TendenciaGeral[]> {
  const token = await obterAccessTokenValido();

  const resposta = await fetch(`${API}/trends/MLB`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, "Falha ao consultar as tendências do Mercado Livre");
  }

  const corpo = (await resposta.json()) as TendenciaBruta[];
  return corpo.map((t) => ({ termo: t.keyword, url: t.url }));
}
