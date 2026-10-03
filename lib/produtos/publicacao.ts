import type { Produto } from "@/lib/models/produto";

/**
 * Filtro MongoDB do que a loja mostra. `publicado` ausente conta como
 * publicado: os produtos cadastrados antes do campo existir continuam no ar
 * sem migração, e só quem for salvo como rascunho (`false`) sai da vitrine.
 */
export const FILTRO_PUBLICADO = { publicado: { $ne: false } } as const;

/** Mesma regra do `FILTRO_PUBLICADO`, para decidir em memória. */
export function estaPublicado(produto: Pick<Produto, "publicado">): boolean {
  return produto.publicado !== false;
}

/**
 * Um produto só vai ao ar com pelo menos uma foto — senão a vitrine renderiza
 * um card sem imagem. Rascunho pode ficar sem foto: é o que permite deixar o
 * cadastro pronto antes de fotografar a peça.
 */
export function faltaFotoParaPublicar(produto: {
  publicado?: boolean;
  fotos?: unknown;
}): boolean {
  if (!estaPublicado(produto)) return false;
  return !Array.isArray(produto.fotos) || produto.fotos.length === 0;
}
