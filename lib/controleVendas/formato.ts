/** "12,50", "12.50", "R$ 1.234,56" → centavos; vazio ou inválido → `null`. */
export function reaisParaCentavos(texto: string): number | null {
  let limpo = texto.replace(/[R$\s]/g, "");
  if (!limpo) return null;
  // Com vírgula, ela é o decimal e os pontos são milhar; sem vírgula, o ponto é o decimal.
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  const valor = Number(limpo);
  if (!Number.isFinite(valor) || valor < 0) return null;
  return Math.round(valor * 100);
}

/** Centavos → "12,50" para preencher um campo de texto. */
export function centavosParaCampo(centavos: number | null): string {
  if (centavos === null) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/** "4,99" ou "4.99" → 4.99; vazio ou inválido → `null`. */
export function textoParaPercentual(texto: string): number | null {
  const limpo = texto.replace("%", "").trim().replace(",", ".");
  if (!limpo) return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) && valor >= 0 ? valor : null;
}

/** Data de hoje no fuso da loja, no formato do `<input type="date">`. */
export function hojeIso(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}
