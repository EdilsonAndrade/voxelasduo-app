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

/**
 * Qualificador em português somado ao nome do produto na consulta ao
 * previsor (research.md #5) — sem isso, um nome de produto com uma palavra
 * genérica (ex: "Chaveiro") pode cair num domínio errado por homônimo (ex:
 * "Antiguidades e Coleções > Chaveiros", em vez de decoração), descoberto
 * testando em produção. Ajuste/complete conforme novas categorias do site
 * surgirem.
 */
const QUALIFICADOR_CATEGORIA: Record<string, string> = {
  decoracao: "decoração",
  organizacao: "organizador",
  personalizados: "personalizado",
};

/** Monta a consulta enviada ao previsor de categorias: nome do produto + um qualificador da categoria do site, quando houver. */
export function montarConsultaPrevisor(categoria: string, nomeProduto: string): string {
  const qualificador = QUALIFICADOR_CATEGORIA[categoria];
  return qualificador ? `${nomeProduto} ${qualificador}` : nomeProduto;
}
