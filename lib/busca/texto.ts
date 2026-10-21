/** Minúsculas e sem acentos, para comparar o que foi digitado com nomes. */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * `true` quando cada palavra digitada aparece em algum dos textos (em qualquer
 * ordem, sem diferenciar acentos/maiúsculas) — busca vazia aceita tudo.
 */
export function combinaBusca(busca: string, ...textos: Array<string | undefined>): boolean {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return true;
  const alvo = normalizar(textos.filter(Boolean).join(" "));
  return palavras.every((p) => alvo.includes(p));
}
