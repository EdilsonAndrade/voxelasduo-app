import {
  buscarMaisVendidosCategoria,
  buscarProdutosCatalogo,
  buscarTendenciasCategoria,
  descobrirDominios,
  obterCategoriaNavegavel,
  obterProdutoCatalogo,
} from "@/lib/estoque/canais/mercadoLivre/tendencias";
import { obterComCache } from "@/lib/tendencias/cache";
import type { CategoriaNavegavel } from "@/lib/models/produtosAlta";
import type { ItemRankingCategoria, ProdutoCatalogo, TendenciaGeral } from "@/lib/models/trendCache";

/** Nome/foto de produto e árvore de categorias quase não mudam (specs/033 research #6). */
const TTL_7_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

export interface DependenciasAlta {
  maisVendidos(categoriaId: string): Promise<ItemRankingCategoria[]>;
  produto(id: string): Promise<ProdutoCatalogo>;
  tendencias(categoriaId: string): Promise<TendenciaGeral[]>;
  buscarCatalogo(termo: string, opcoes: { limite: number; dominioId?: string }): Promise<ProdutoCatalogo[]>;
  descobrirDominios(termo: string): Promise<Array<{ dominioId: string; categoriaId: string }>>;
  categoria(id: string): Promise<CategoriaNavegavel>;
}

/** Dependências reais: ML com o token do app, produto e categoria guardados por 7 dias. */
export function dependenciasReais(): DependenciasAlta {
  return {
    maisVendidos: buscarMaisVendidosCategoria,
    tendencias: buscarTendenciasCategoria,
    buscarCatalogo: buscarProdutosCatalogo,
    descobrirDominios,
    async produto(id) {
      const { dados } = await obterComCache<{ produto: ProdutoCatalogo }>({
        chave: `alta:produto:${id}`,
        ttlMs: TTL_7_DIAS_MS,
        buscarNovo: async () => ({ produto: await obterProdutoCatalogo(id) }),
      });
      return dados.produto;
    },
    async categoria(id) {
      const { dados } = await obterComCache<{ categoria: CategoriaNavegavel }>({
        chave: `alta:categoria:${id}`,
        ttlMs: TTL_7_DIAS_MS,
        buscarNovo: async () => ({ categoria: await obterCategoriaNavegavel(id) }),
      });
      return dados.categoria;
    },
  };
}
