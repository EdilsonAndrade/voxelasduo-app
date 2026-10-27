import type { ReferenciaPreco, ValoresComponente } from "@/lib/models/kit";

export type CampoDesatualizado = "preco" | "peso" | "tempo" | "custo" | "removido" | "incluido" | "retirado" | "quantidade";

export interface Desatualizacao {
  produtoId: string;
  nome: string;
  campo: CampoDesatualizado;
  antes: number | null;
  depois: number | null;
}

export interface ItemAtual {
  produtoId: string;
  quantidade: number;
  valores: ValoresComponente;
  removido: boolean;
}

/**
 * O que mudou desde que o preço do kit foi definido (specs/037, research #3):
 * preço, peso, tempo ou custo de algum componente, item incluído/retirado,
 * quantidade alterada ou produto apagado. Vazio = preço em dia.
 */
export function compararReferencia(referencia: ReferenciaPreco | undefined, itens: ItemAtual[]): Desatualizacao[] {
  if (!referencia) return [];
  const mudancas: Desatualizacao[] = [];
  const vistos = new Set<string>();

  for (const item of itens) {
    vistos.add(item.produtoId);
    const antes = referencia.itens[item.produtoId];
    const nome = item.valores.nome;
    if (!antes) {
      mudancas.push({ produtoId: item.produtoId, nome, campo: "incluido", antes: null, depois: item.quantidade });
      continue;
    }
    if (item.removido) {
      mudancas.push({ produtoId: item.produtoId, nome, campo: "removido", antes: null, depois: null });
      continue;
    }
    if (antes.quantidade !== item.quantidade) {
      mudancas.push({ produtoId: item.produtoId, nome, campo: "quantidade", antes: antes.quantidade, depois: item.quantidade });
    }
    const campos: Array<[CampoDesatualizado, keyof ValoresComponente]> = [
      ["preco", "precoCentavos"],
      ["peso", "pesoGramas"],
      ["tempo", "tempoMinutos"],
      ["custo", "custoCentavos"],
    ];
    for (const [campo, chave] of campos) {
      const a = antes[chave] as number | null;
      const d = item.valores[chave] as number | null;
      if (a !== d) mudancas.push({ produtoId: item.produtoId, nome, campo, antes: a, depois: d });
    }
  }

  for (const [produtoId, antes] of Object.entries(referencia.itens)) {
    if (!vistos.has(produtoId)) {
      mudancas.push({ produtoId, nome: antes.nome, campo: "retirado", antes: antes.quantidade, depois: null });
    }
  }
  return mudancas;
}
