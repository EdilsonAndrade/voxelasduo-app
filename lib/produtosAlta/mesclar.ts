import type { ItemEmAlta } from "@/lib/models/produtosAlta";

/**
 * Junta as listas das categorias no "Todas" (specs/033 research #7):
 * intercala por posição (todos os 1º, depois os 2º…) mantendo a ordem das
 * categorias no empate, e tira repetidos ficando a melhor posição.
 */
export function mesclarListas(listas: ItemEmAlta[][]): ItemEmAlta[] {
  const ordenados = listas
    .flatMap((lista, indiceLista) => lista.map((item) => ({ item, indiceLista })))
    .sort(
      (a, b) =>
        (a.item.posicao ?? Infinity) - (b.item.posicao ?? Infinity) || a.indiceLista - b.indiceLista
    );

  const vistos = new Set<string>();
  const resultado: ItemEmAlta[] = [];
  for (const { item } of ordenados) {
    if (vistos.has(item.chave)) continue;
    vistos.add(item.chave);
    resultado.push(item);
  }
  return resultado;
}
