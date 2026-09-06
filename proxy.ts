import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { rotaExigeAutenticacao } from "@/lib/auth/rotaProtegida";

/**
 * Proteção do painel administrativo (Tarefa 9/EDI-86) — ver
 * specs/008-auth-painel-admin/contracts/auth-api.md. Usa o arquivo `proxy.ts`
 * (Next.js 16 renomeou o antigo `middleware.ts`; roda sempre em runtime
 * Node.js, então pode importar `getMongoClient`/`bcryptjs` sem restrição).
 */
export default auth((req) => {
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
  matcher: ["/admin/:path*", "/api/produtos/:path*", "/api/pedidos/:path*"],
};
