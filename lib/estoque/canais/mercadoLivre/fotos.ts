/** Limite de fotos por anúncio imposto pela API do Mercado Livre (array `pictures` de `/items`). */
export const LIMITE_FOTOS_MERCADO_LIVRE = 6;

/**
 * Fotos que vão para o anúncio do Mercado Livre, na ordem do produto (EDI-99).
 * Corte puro — não valida URL nem faz chamada de rede.
 */
export function fotosParaAnuncio(fotos: string[]): string[] {
  return fotos.slice(0, LIMITE_FOTOS_MERCADO_LIVRE);
}
