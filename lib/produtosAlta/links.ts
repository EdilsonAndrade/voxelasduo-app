/**
 * Links dos cards (specs/033 research #2/#8) — montados sem requisição, nos
 * formatos públicos do ML (os mesmos reconhecidos em `lib/nichos/linkProduto.ts`).
 */

export type TipoItemMl = "PRODUCT" | "ITEM" | "USER_PRODUCT";

/** "Papel Higiênico 3M" → "papel-higiênico-3m" (formato de `lista.mercadolivre.com.br`). */
export function slugBuscaMl(termo: string): string {
  return termo.trim().toLowerCase().replace(/\s+/g, "-");
}

export function linkBuscaMercadoLivre(termo: string): string {
  return `https://lista.mercadolivre.com.br/${encodeURIComponent(slugBuscaMl(termo))}`;
}

/** Página do item no ML pelo tipo devolvido pelo ranking. */
export function linkItemMercadoLivre(tipo: TipoItemMl, id: string): string {
  if (tipo === "PRODUCT") return `https://www.mercadolivre.com.br/p/${encodeURIComponent(id)}`;
  if (tipo === "USER_PRODUCT") return `https://www.mercadolivre.com.br/up/${encodeURIComponent(id)}`;
  // Anúncio: MLB4266838277 → produto.mercadolivre.com.br/MLB-4266838277
  return `https://produto.mercadolivre.com.br/${id.replace(/^([A-Z]{3})(\d+)$/, "$1-$2")}`;
}

export function linkShopee(nome: string | undefined): string | undefined {
  const termo = nome?.trim();
  return termo ? `https://shopee.com.br/search?keyword=${encodeURIComponent(termo)}` : undefined;
}

export function linkMakerWorld(nome: string | undefined): string | undefined {
  const termo = nome?.trim();
  return termo ? `https://makerworld.com/pt/search/models?keyword=${encodeURIComponent(termo)}` : undefined;
}

const MAX_PALAVRAS_BUSCA = 5;

/**
 * Nomes do ML são longos ("Porta Papel Higiênico Inox Adesivo 3M ViMad
 * Parede Prateado") e quase não acham nada na Shopee/MakerWorld — as
 * primeiras palavras descrevem o produto.
 */
export function resumirNome(nome: string | undefined): string | undefined {
  const palavras = (nome ?? "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_PALAVRAS_BUSCA);
  return palavras.length ? palavras.join(" ") : undefined;
}
