import type { ObjectId } from "mongodb";

export const CATEGORIAS_COLLECTION = "categorias";

/** Slug fixo da categoria padrão — destino de produtos sem categoria e de categorias removidas (EDI-123). */
export const SLUG_CATEGORIA_PADRAO = "diversos";

/**
 * Categoria do site (vitrine e URL `/produtos/[categoria]/[slug]`) — não tem
 * relação com a categoria do anúncio no Mercado Livre, que continua no
 * seletor próprio (`integracoes.mercadoLivreCategoriaId`). `produto.categoria`
 * guarda o `slug` daqui (research.md #1).
 */
export interface Categoria {
  _id?: ObjectId;
  nome: string;
  /** Gerado do nome na criação e imutável: renomear não muda a URL (research.md #2). */
  slug: string;
  ordem: number;
  /** `true` só em "Diversos" — não pode ser removida. */
  padrao?: boolean;
  /** Segmentos de URL antigos (texto livre legado, categorias removidas) que redirecionam para esta. */
  aliases: string[];
  criadoEm: Date;
  atualizadoEm: Date;
}

/** Categorias iniciais, na ordem da vitrine (FR-002). */
export const CATEGORIAS_INICIAIS: ReadonlyArray<{ nome: string; slug: string; padrao?: boolean }> = [
  { nome: "Organizadores", slug: "organizadores" },
  { nome: "Acessórios", slug: "acessorios" },
  { nome: "Decoração", slug: "decoracao" },
  { nome: "Presentes", slug: "presentes" },
  { nome: "Religioso", slug: "religioso" },
  { nome: "Diversos", slug: SLUG_CATEGORIA_PADRAO, padrao: true },
];

/** Formato enxuto usado por páginas e componentes (seletores, chips da vitrine). */
export interface CategoriaResumo {
  slug: string;
  nome: string;
}
