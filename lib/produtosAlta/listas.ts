import type { CategoriaNavegavel, ItemEmAlta } from "@/lib/models/produtosAlta";
import type { ProdutoCatalogo } from "@/lib/models/trendCache";
import { ehDescendente } from "./categorias";
import type { DependenciasAlta } from "./dependencias";
import {
  linkBuscaMercadoLivre,
  linkItemMercadoLivre,
  linkMakerWorld,
  linkShopee,
  resumirNome,
} from "./links";

/** Mesmo corte da Pesquisa de nichos (specs/030 FR-015): os 20 termos mais buscados. */
export const TERMOS_POR_CATEGORIA = 20;
export const RESULTADOS_BUSCA = 24;
/** Chamadas simultâneas ao ML por lista (specs/033 research #7). */
const CONCORRENCIA = 4;

async function mapearLimitado<T, R>(itens: T[], limite: number, fn: (item: T, indice: number) => Promise<R>): Promise<R[]> {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;
  async function trabalhador() {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await fn(itens[indice], indice);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

function linksDeBusca(nome: string | undefined) {
  const curto = resumirNome(nome);
  return { shopee: linkShopee(curto), makerworld: linkMakerWorld(curto) };
}

/**
 * Mais vendidos da categoria (US1). Nome e foto só existem para `PRODUCT`;
 * falha ao ler um produto vira card substituto, não derruba a lista.
 */
export async function listarMaisVendidos(categoria: CategoriaNavegavel, deps: DependenciasAlta): Promise<ItemEmAlta[]> {
  const ranking = await deps.maisVendidos(categoria.id);

  return mapearLimitado(ranking, CONCORRENCIA, async (item) => {
    let produto: Partial<ProdutoCatalogo> = {};
    if (item.tipo === "PRODUCT") {
      try {
        produto = await deps.produto(item.id);
      } catch {
        produto = {};
      }
    }

    return {
      chave: `${item.tipo}:${item.id}`,
      origem: "vendido",
      posicao: item.posicao,
      nome: produto.nome,
      foto: produto.foto,
      categoriaId: categoria.id,
      categoriaNome: categoria.nome,
      links: { mercadoLivre: linkItemMercadoLivre(item.tipo, item.id), ...linksDeBusca(produto.nome) },
    } satisfies ItemEmAlta;
  });
}

/** Termos mais buscados da categoria (US2), cada um com a foto do 1º produto de catálogo do termo. */
export async function listarMaisProcurados(categoria: CategoriaNavegavel, deps: DependenciasAlta): Promise<ItemEmAlta[]> {
  const termos = (await deps.tendencias(categoria.id)).slice(0, TERMOS_POR_CATEGORIA);

  return mapearLimitado(termos, CONCORRENCIA, async (t, indice) => {
    let produto: ProdutoCatalogo | undefined;
    try {
      [produto] = await deps.buscarCatalogo(t.termo, { limite: 1 });
    } catch {
      produto = undefined;
    }

    return {
      chave: `TERMO:${t.termo.trim().toLowerCase()}`,
      origem: "procurado",
      posicao: indice + 1,
      nome: produto?.nome,
      termo: t.termo,
      foto: produto?.foto,
      categoriaId: categoria.id,
      categoriaNome: categoria.nome,
      // O termo é o que as pessoas digitam — busca melhor que o nome longo do produto.
      links: { mercadoLivre: linkBuscaMercadoLivre(t.termo), ...linksDeBusca(t.termo) },
    } satisfies ItemEmAlta;
  });
}

function itemDeBusca(produto: ProdutoCatalogo, categoria?: CategoriaNavegavel): ItemEmAlta {
  return {
    chave: `PRODUCT:${produto.id}`,
    origem: "busca",
    posicao: null,
    nome: produto.nome,
    foto: produto.foto,
    categoriaId: categoria?.id,
    categoriaNome: categoria?.nome,
    links: { mercadoLivre: linkItemMercadoLivre("PRODUCT", produto.id), ...linksDeBusca(produto.nome) },
  };
}

/**
 * Busca por nome (US4). Sem categoria: catálogo todo. Com categoria: o ML
 * ignora `category` na busca de catálogo, então descobre os tipos de produto
 * do termo e fica só com os que caem dentro da categoria (research #5).
 */
export async function buscarPorNome(
  termo: string,
  categoria: CategoriaNavegavel | undefined,
  deps: DependenciasAlta
): Promise<ItemEmAlta[]> {
  if (!categoria) {
    const produtos = await deps.buscarCatalogo(termo, { limite: RESULTADOS_BUSCA });
    return produtos.map((p) => itemDeBusca(p));
  }

  const sugeridos = await deps.descobrirDominios(termo);
  const vistos = new Set<string>();
  const unicos = sugeridos.filter((d) => !vistos.has(d.dominioId) && vistos.add(d.dominioId));

  const dentro = (
    await mapearLimitado(unicos, CONCORRENCIA, async (d) => {
      try {
        const sub = await deps.categoria(d.categoriaId);
        return ehDescendente(sub, categoria.id) ? { ...d, sub } : undefined;
      } catch {
        return undefined;
      }
    })
  ).filter((d) => d !== undefined);

  if (dentro.length === 0) return [];

  const porDominio = Math.ceil(RESULTADOS_BUSCA / dentro.length);
  const listas = await mapearLimitado(dentro, CONCORRENCIA, async (d) =>
    (await deps.buscarCatalogo(termo, { limite: porDominio, dominioId: d.dominioId })).map((p) => itemDeBusca(p, d.sub))
  );

  const ids = new Set<string>();
  return listas
    .flat()
    .filter((item) => !ids.has(item.chave) && ids.add(item.chave))
    .slice(0, RESULTADOS_BUSCA);
}
