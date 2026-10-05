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

/**
 * Converte o texto digitado no campo de estoque em unidades inteiras.
 * Vazio = `null` (o campo é obrigatório, quem decide é `erroEstoque`);
 * texto que não é um inteiro = `NaN`.
 */
export function textoParaEstoque(texto: string): number | null {
  const limpo = texto.replace(/\s/g, "");
  if (limpo === "") return null;
  if (!/^\d+$/.test(limpo)) return Number.NaN;
  return Number(limpo);
}

/** Erro do estoque (obrigatório, inteiro ≥ 0) — `null` quando válido. */
export function erroEstoque(unidades: number | null): string | null {
  if (unidades === null) return "Informe o estoque.";
  if (Number.isNaN(unidades)) return "Estoque inválido. Use um número inteiro de unidades.";
  if (unidades < 0) return "O estoque não pode ser negativo.";
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

/** Menor valor ≥ `centavos` terminando em ,90 (ex.: 14286 → 14290; 14295 → 14390). */
export function arredondarPara90Acima(centavos: number): number {
  const candidato = Math.floor(centavos / 100) * 100 + 90;
  return candidato >= centavos ? candidato : candidato + 100;
}

/** Percentual do ajuste do evento aceito: 1 a 90 (90% já multiplica o preço por 10). */
export function percentualAjusteValido(percentual: number): boolean {
  return Number.isFinite(percentual) && percentual >= 1 && percentual <= 90;
}

/**
 * Preço do evento que, descontada a comissão, devolve o preço atual (EDI-126):
 * `preço ÷ (1 − %)`, arredondado para cima terminando em ,90. Multiplicar por
 * (1 + %) faria o vendedor receber menos que o preço de antes.
 */
export function ajustarPrecoEvento(centavos: number, percentual: number): number {
  return arredondarPara90Acima(Math.ceil(centavos / (1 - percentual / 100)));
}

/** Teto de peças por produto na comanda impressa: além disso a fileira não cabe na folha. */
export const MAX_QUANTIDADE_EVENTO = 60;

/**
 * Erro da quantidade que vai ao evento (obrigatória, inteiro de 1 a
 * `MAX_QUANTIDADE_EVENTO`) — `null` quando válida. Produto marcado sem peça
 * não tem o que levar, por isso zero não passa.
 */
export function erroQuantidadeEvento(unidades: number | null): string | null {
  if (unidades === null) return "Informe quantas peças vão ao evento.";
  if (Number.isNaN(unidades)) return "Quantidade inválida. Use um número inteiro de peças.";
  if (unidades < 1) return "Leve pelo menos 1 peça.";
  if (unidades > MAX_QUANTIDADE_EVENTO) return `No máximo ${MAX_QUANTIDADE_EVENTO} peças por produto na lista.`;
  return null;
}

/** Item da lista impressa: o produto e quantas peças vão ao evento. */
export interface ItemListaEvento {
  id: string;
  quantidade: number;
}

/** Itens → parâmetro `ids` da lista de preços ("id:qtd,id:qtd"). */
export function serializarItensLista(itens: readonly ItemListaEvento[]): string {
  return itens.map((item) => `${item.id}:${item.quantidade}`).join(",");
}

/**
 * Parâmetro `ids` → itens, na ordem recebida e sem repetir id. Quantidade
 * ausente ou inválida cai em 1 peça (o admin já cobra o campo) e o teto é
 * `MAX_QUANTIDADE_EVENTO`.
 */
export function parseItensLista(param: string): ItemListaEvento[] {
  const itens: ItemListaEvento[] = [];
  const vistos = new Set<string>();
  for (const parte of param.split(",")) {
    const [idBruto = "", qtdBruta = ""] = parte.trim().split(":");
    const id = idBruto.trim();
    if (id === "" || vistos.has(id)) continue;
    vistos.add(id);
    const quantidade = textoParaEstoque(qtdBruta);
    const valida = quantidade !== null && !Number.isNaN(quantidade) && quantidade >= 1;
    itens.push({ id, quantidade: valida ? Math.min(quantidade, MAX_QUANTIDADE_EVENTO) : 1 });
  }
  return itens;
}
