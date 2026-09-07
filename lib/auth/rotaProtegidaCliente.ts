/**
 * Matriz de proteção da área do comprador (Tarefa 10/EDI-84), documentada em
 * specs/009-auth-painel-comprador/contracts/auth-cliente-api.md. Função pura
 * para ser testável isoladamente e reaproveitada pelo `proxy.ts` — mesmo
 * padrão de `lib/auth/rotaProtegida.ts` (admin), mas para a sessão do
 * cliente, sem nenhuma sobreposição com a matriz do admin.
 */
export type VeredictoRotaCliente =
  | { protegida: false }
  | { protegida: true; tipoResposta: "redirect" | "json" };

export function rotaClienteExigeAutenticacao(pathname: string, _method: string): VeredictoRotaCliente {
  if (pathname === "/minha-conta" || pathname.startsWith("/minha-conta/")) {
    return { protegida: true, tipoResposta: "redirect" };
  }

  // Cadastro, recuperação/redefinição de senha (/api/clientes, /api/clientes/recuperar-senha,
  // /api/clientes/redefinir-senha) são públicas — só "/pedidos" e "/me" exigem sessão.
  if (pathname === "/api/clientes/pedidos" || pathname.startsWith("/api/clientes/pedidos/")) {
    return { protegida: true, tipoResposta: "json" };
  }

  if (pathname === "/api/clientes/me" || pathname.startsWith("/api/clientes/me/")) {
    return { protegida: true, tipoResposta: "json" };
  }

  return { protegida: false };
}
