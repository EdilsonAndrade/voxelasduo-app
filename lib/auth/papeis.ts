import type { PapelUsuario } from "@/lib/models/usuario";

/** Página inicial (e única área) da equipe de evento (EDI-125). */
export const AREA_EVENTO = "/admin/evento";

function dentro(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Função pura usada pelo proxy depois da autenticação: o papel "equipe" só
 * acessa a área de pedidos de evento; o admin (ou papel ausente, usuários
 * anteriores ao EDI-125) acessa tudo.
 */
export function rotaPermitidaParaPapel(papel: PapelUsuario | undefined, pathname: string): boolean {
  if (papel !== "equipe") return true;
  return dentro(pathname, AREA_EVENTO) || dentro(pathname, "/api/admin/evento");
}
