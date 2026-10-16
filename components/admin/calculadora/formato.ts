export function numero(texto: string | undefined): number {
  return Number((texto ?? "").trim().replace(",", "."));
}

export function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function porcentagem(n: number, casas = 1): string {
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

/** ROAS com uma casa, arredondado para cima — a meta nunca fica abaixo do necessário. */
export function formatarRoas(roas: number): string {
  return (Math.ceil(roas * 10) / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** ACOS (usado no Mercado Livre) = 100 ÷ ROAS, arredondado para baixo — o teto nunca fica acima do permitido. */
export function formatarAcos(roas: number): string {
  return `${(Math.floor((100 / roas) * 10) / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** Só dígitos, vírgula e ponto. */
export function soNumero(texto: string): string {
  return texto.replace(/[^\d.,]/g, "");
}
