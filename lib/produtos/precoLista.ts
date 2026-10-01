/**
 * Helpers da lista de produtos do admin (EDI-126): edição rápida de preços e
 * lista de preços impressa para eventos. Funções puras, usadas no cliente e
 * no servidor.
 */

/**
 * Converte o texto digitado ("49,90", "49.90", "R$ 49,90") em centavos.
 * Vazio = `null`; texto que não é número = `NaN`.
 */
export function textoParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/R\$/i, "").replace(/\s/g, "");
  if (limpo === "") return null;
  // Com vírgula, o ponto é separador de milhar ("1.299,90"); sem vírgula, o ponto é decimal.
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  if (!/^\d+(\.\d{0,2})?$/.test(normalizado)) return Number.NaN;
  return Math.round(Number(normalizado) * 100);
}

/** Centavos → texto do campo ("49,90"); `null`/ausente = vazio. */
export function centavosParaTexto(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/** Erro do preço do site (obrigatório, > 0) — `null` quando válido. */
export function erroPrecoSite(centavos: number | null): string | null {
  if (centavos === null) return "Informe o preço do site.";
  if (Number.isNaN(centavos)) return "Preço do site inválido. Use, por exemplo, 49,90.";
  if (centavos <= 0) return "O preço do site deve ser maior que zero.";
  return null;
}

/** Erro do preço do Mercado Livre (opcional; vazio = usa o do site) — `null` quando válido. */
export function erroPrecoMercadoLivre(centavos: number | null): string | null {
  if (centavos === null) return null;
  if (Number.isNaN(centavos)) return "Preço do Mercado Livre inválido. Use, por exemplo, 49,90.";
  if (centavos <= 0) return "O preço do Mercado Livre deve ser maior que zero.";
  return null;
}

/** Margem sobre o preço, em % inteiro: (preço − custo) ÷ preço. `null` sem custo ou preço válido. */
export function margemPercentual(precoCentavos: number | null, custoCentavos: number | null): number | null {
  if (custoCentavos === null || precoCentavos === null || !(precoCentavos > 0)) return null;
  return Math.round(((precoCentavos - custoCentavos) / precoCentavos) * 100);
}

/** Ordem alfabética pt-BR, sem diferenciar maiúsculas e acentos. Não altera o array recebido. */
export function ordenarPorNome<T extends { nome: string }>(itens: readonly T[]): T[] {
  return [...itens].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

/** Letra do índice da lista impressa: inicial sem acento, em maiúscula; não letra = "#". */
export function letraIndice(nome: string): string {
  const inicial = nome.trim().charAt(0).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  return /^[A-Z]$/.test(inicial) ? inicial : "#";
}
