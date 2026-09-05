/**
 * Override manual, opcional, `categoria do site → category_id do Mercado
 * Livre` (research.md #5, revisado após teste em produção). Por padrão a
 * categoria é descoberta automaticamente pelo previsor do Mercado Livre
 * (`previsorCategoria.ts`), a partir do título do produto — mais confiável
 * do que uma lista fixa, já que `POST /items` exige uma subcategoria válida
 * (categorias de nível 1, como "Casa, Móveis e Decoração" / `MLB1574`, são
 * rejeitadas). Preencha uma entrada aqui só se o previsor errar
 * consistentemente para uma categoria do site — o valor aqui sempre tem
 * prioridade sobre o previsor.
 */
const OVERRIDE_CATEGORIAS: Record<string, string> = {};

/** Category_id fixado manualmente para a categoria do site, se houver; `undefined` caso o previsor deva decidir. */
export function resolverCategoriaMercadoLivre(categoria: string): string | undefined {
  const categoryId = OVERRIDE_CATEGORIAS[categoria];
  return categoryId ? categoryId : undefined;
}
