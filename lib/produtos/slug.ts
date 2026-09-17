const MARCAS_DIACRITICAS = new RegExp("[̀-ͯ]", "g");

/**
 * Decodifica um segmento de rota vindo de `params`. O Next.js entrega os
 * parâmetros de rota ainda percent-encoded (diferente de `searchParams`, que
 * já vem decodificado): sem isso, a categoria "decoração" chega como
 * "decora%C3%A7%C3%A3o" e nunca casa com o valor gravado no banco — categorias
 * sem acento funcionavam porque não têm nada a codificar. Devolve o valor
 * original quando a URL traz um `%` solto (URL inválida digitada pelo
 * visitante), em vez de estourar com `URIError`.
 */
export function decodificarSegmentoRota(segmento: string): string {
  try {
    return decodeURIComponent(segmento);
  } catch {
    return segmento;
  }
}

/** Normaliza o nome de um produto em um slug de URL (minusculas, sem acentos, hifen). */
export function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
