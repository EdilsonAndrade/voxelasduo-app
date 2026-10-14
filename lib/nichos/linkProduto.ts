export type OrigemLink = "shopee" | "mercado_livre";

function lerUrl(link: string): URL | null {
  try {
    const url = new URL(link.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function origemDoLink(link: string): OrigemLink | null {
  const host = lerUrl(link)?.hostname.toLowerCase() ?? "";
  if (/(^|\.)shopee\.com\.br$/.test(host)) return "shopee";
  if (/(^|\.)mercadoli(vre|bre)\.com(\.br)?$/.test(host)) return "mercado_livre";
  return null;
}

function slugParaNome(slug: string): string | null {
  let texto = slug;
  try {
    texto = decodeURIComponent(slug);
  } catch {
    // slug com % solto: usa como veio
  }
  const nome = texto.replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();
  return nome.length >= 3 ? nome : null;
}

/**
 * Nome do produto tirado do próprio endereço, sem abrir a página — Shopee e ML
 * exigem verificação antibot (specs/030 research #6). `null` quando o link não
 * carrega nome (link curto, `shopee.com.br/product/<loja>/<item>`).
 */
export function nomeDoLink(link: string): string | null {
  const url = lerUrl(link);
  const origem = origemDoLink(link);
  if (!url || !origem) return null;

  const partes = url.pathname.split("/").filter(Boolean);

  if (origem === "shopee") {
    // shopee.com.br/Nome-Do-Produto-i.<loja>.<item>
    const comItem = partes.find((p) => /-i\.\d+\.\d+$/.test(p));
    return comItem ? slugParaNome(comItem.replace(/-i\.\d+\.\d+$/, "")) : null;
  }

  // lista.mercadolivre.com.br/<termo>
  if (url.hostname.startsWith("lista.")) return partes[0] ? slugParaNome(partes[0].replace(/_.*$/, "")) : null;

  // produto.mercadolivre.com.br/MLB-123456-nome-do-produto-_JM
  const anuncio = partes.find((p) => /^MLB-?\d+-/i.test(p));
  if (anuncio) return slugParaNome(anuncio.replace(/^MLB-?\d+-/i, "").replace(/-?_JM$/i, ""));

  // www.mercadolivre.com.br/nome-do-produto/p/MLB123 (ou /up/MLBU123)
  const marcador = partes.findIndex((p) => p === "p" || p === "up");
  if (marcador > 0) return slugParaNome(partes[marcador - 1]);

  return null;
}
