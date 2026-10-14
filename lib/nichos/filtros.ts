import type { FiltrosNicho } from "@/lib/models/nicho";

/** Filtros da query string — ausentes valem `true` (padrão da tela: 1 cor e A1). */
export function filtrosDaQuery(params: URLSearchParams): FiltrosNicho {
  return {
    umaCor: params.get("umaCor") !== "0",
    compativelA1: params.get("a1") !== "0",
  };
}

/** Parte da chave de cache: o mesmo termo com filtros diferentes é outra pesquisa. */
export function sufixoFiltros(filtros: FiltrosNicho): string {
  return `${filtros.umaCor ? "1cor" : "cores"}:${filtros.compativelA1 ? "a1" : "todas"}`;
}
