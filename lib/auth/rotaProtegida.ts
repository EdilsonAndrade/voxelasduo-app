/**
 * Matriz de proteção do painel administrativo (Tarefa 9/EDI-86), documentada
 * em specs/008-auth-painel-admin/contracts/auth-api.md. Função pura para ser
 * testável isoladamente e reaproveitada pelo middleware.ts.
 */
export type VeredictoRota =
  | { protegida: false }
  | { protegida: true; tipoResposta: "redirect" | "json" };

export function rotaExigeAutenticacao(pathname: string, method: string): VeredictoRota {
  // Tela de login precisa ficar acessível sem sessão (senão ninguém entra).
  if (pathname === "/admin/login") {
    return { protegida: false };
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return { protegida: true, tipoResposta: "redirect" };
  }

  // Exceção: POST /api/pedidos (raiz) é usada pelo checkout público para
  // criar o pedido — nunca autenticado. Qualquer outro método na mesma rota
  // (ex: GET) é a listagem administrativa e exige sessão.
  if (pathname === "/api/pedidos") {
    return method === "POST" ? { protegida: false } : { protegida: true, tipoResposta: "json" };
  }

  if (pathname.startsWith("/api/pedidos/")) {
    return { protegida: true, tipoResposta: "json" };
  }

  if (pathname === "/api/produtos" || pathname.startsWith("/api/produtos/")) {
    return { protegida: true, tipoResposta: "json" };
  }

  return { protegida: false };
}
