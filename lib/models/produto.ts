import type { ObjectId } from "mongodb";

export const PRODUTOS_COLLECTION = "produtos";

/** IDs do anúncio correspondente em cada canal externo — ausência = produto sem anúncio naquele canal. */
export interface IntegracoesCanal {
  mercadoLivreId?: string;
  /** URL pública do anúncio, devolvida pela API na criação (`item.permalink`) — não reconstruir manualmente (ver anuncios.ts). */
  mercadoLivrePermalink?: string;
  shopeeItemId?: string;
}

export interface Produto {
  _id?: ObjectId;
  nome: string;
  /** Identificador de URL, único dentro da categoria (/produtos/[categoria]/[slug]). */
  slug: string;
  descricao: string;
  /** Preço de venda em centavos, para evitar erros de ponto flutuante. */
  preco: number;
  fotos: string[];
  estoque: number;
  categoria: string;
  integracoes?: IntegracoesCanal;
  criadoEm: Date;
  atualizadoEm: Date;
}
