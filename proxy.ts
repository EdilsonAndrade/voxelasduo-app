import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/lib/auth/config";
import { rotaExigeAutenticacao } from "@/lib/auth/rotaProtegida";
import { rotaClienteExigeAutenticacao } from "@/lib/auth/rotaProtegidaCliente";

const CLIENTE_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-cliente.session-token"
    : "cliente.session-token";

/**
 * Proteção da área do comprador (Tarefa 10/EDI-84) — ver
 * specs/009-auth-painel-comprador/contracts/auth-cliente-api.md. Usa
 * `getToken` (em vez do `auth(...)` HOF, já ocupado pela instância do admin
 * abaixo) para ler a sessão da segunda instância do NextAuth (cookie/secret
 * próprios de `lib/auth/clienteConfig.ts`) sem qualquer estado global
 * compartilhado entre as duas instâncias (research.md #1/#9b).
 */
async function protegerRotaCliente(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  const veredito = rotaClienteExigeAutenticacao(pathname, req.method);

  if (!veredito.protegida) {
    return null;
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_CLIENTE_SECRET,
    cookieName: CLIENTE_COOKIE_NAME,
  });

  if (token) {
    return null;
  }

  if (veredito.tipoResposta === "redirect") {
    const loginUrl = new URL("/entrar", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
}

/**
 * Proteção do painel administrativo (Tarefa 9/EDI-86) — ver
 * specs/008-auth-painel-admin/contracts/auth-api.md. Usa o arquivo `proxy.ts`
 * (Next.js 16 renomeou o antigo `middleware.ts`; roda sempre em runtime
 * Node.js, então pode importar `getMongoClient`/`bcryptjs` sem restrição).
 */
export default auth(async (req) => {
  const respostaCliente = await protegerRotaCliente(req);
  if (respostaCliente) {
    return respostaCliente;
  }

  const { pathname } = req.nextUrl;
  const veredito = rotaExigeAutenticacao(pathname, req.method);

  if (!veredito.protegida || req.auth) {
    return NextResponse.next();
  }

  if (veredito.tipoResposta === "redirect") {
    const loginUrl = new URL("/admin/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/produtos/:path*",
    "/api/pedidos/:path*",
    "/minha-conta/:path*",
    "/api/clientes/:path*",
  ],
};
