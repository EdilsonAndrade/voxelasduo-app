/**
 * Mapeamento estático `categoria do site → category_id do Mercado Livre`
 * (research.md #5). As categorias do site (ver `scripts/seed.ts`) são um
 * conjunto pequeno e fixo — não compensa consultar a árvore de categorias do
 * Mercado Livre dinamicamente a cada publicação.
 *
 * `MLB1574` ("Casa, Móveis e Decoração") é uma categoria de nível 1 (raiz) —
 * o Mercado Livre normalmente exige uma subcategoria mais específica para
 * `POST /items`. Se a publicação começar a falhar com erro de categoria
 * (visível em `GET /api/anuncios/pendencias`), troque o valor abaixo por uma
 * subcategoria de `MLB1574` (consultar `GET /sites/MLB/categories/MLB1574`
 * ou o previsor `GET /sites/MLB/domain_discovery/search?q=<termo>` em
 * developers.mercadolivre.com.br) — o restante do fluxo não muda.
 */
const MAPEAMENTO_CATEGORIAS: Record<string, string> = {
  decoracao: "MLB1574",
  organizacao: "MLB1574",
  personalizados: "MLB1574",
};

/** Retorna o `category_id` do Mercado Livre para a categoria do site, ou `undefined` se não houver mapeamento configurado. */
export function resolverCategoriaMercadoLivre(categoria: string): string | undefined {
  const categoryId = MAPEAMENTO_CATEGORIAS[categoria];
  return categoryId ? categoryId : undefined;
}
