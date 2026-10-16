/** De onde o card veio: ranking de mais vendidos, termos mais buscados ou busca por nome (EDI-130). */
export type OrigemItem = "vendido" | "procurado" | "busca";

export type OrdemLista = "vendidos" | "procurados";

/**
 * Um card do buscador de produtos em alta (specs/033 data-model.md). Preço,
 * vendas e visitas ficam de fora: o Mercado Livre não libera esses dados de
 * anúncio de terceiros para o app (EDI-129).
 */
export interface ItemEmAlta {
  /** `PRODUCT:MLB123`, `ITEM:MLB123`, `TERMO:<termo>` — tira repetidos no "Todas". */
  chave: string;
  origem: OrigemItem;
  /** 1-based; `null` na busca por nome. */
  posicao: number | null;
  /** Nome do produto ou o termo; ausente quando o ML bloqueia a leitura (ITEM/USER_PRODUCT). */
  nome?: string;
  /** Só em `procurado`: o termo buscado (o `nome` é o do produto da foto). */
  termo?: string;
  foto?: string;
  /** Ausente na busca por nome em todo o catálogo. */
  categoriaId?: string;
  categoriaNome?: string;
  links: {
    mercadoLivre: string;
    shopee?: string;
    makerworld?: string;
  };
}

export interface CategoriaResumo {
  id: string;
  nome: string;
}

/** Categoria do ML com caminho até ela (breadcrumb) e filhas diretas (chips). */
export interface CategoriaNavegavel extends CategoriaResumo {
  caminho: CategoriaResumo[];
  filhas: CategoriaResumo[];
}

/** Documento guardado em `trend_cache` para uma lista (24h). */
export interface ListaEmAlta extends Record<string, unknown> {
  tipo: "alta";
  itens: ItemEmAlta[];
}
