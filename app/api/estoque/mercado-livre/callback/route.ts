import { NextResponse } from "next/server";
import { salvarCredencialInicial } from "@/lib/estoque/canais/mercadoLivre/auth";

/**
 * Passo único do fluxo OAuth2 "Authorization Code" do Mercado Livre
 * (quickstart.md): troca o `code` recebido no redirect pelo primeiro par
 * accessToken/refreshToken e grava em `credenciaisCanais`. Depois disso, o
 * client (`lib/estoque/canais/mercadoLivre/auth.ts`) renova sozinho.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ erro: "Parâmetro 'code' ausente." }, { status: 400 });
  }

  const resposta = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.MERCADOLIVRE_CLIENT_ID ?? "",
      client_secret: process.env.MERCADOLIVRE_CLIENT_SECRET ?? "",
      code,
      redirect_uri: process.env.MERCADOLIVRE_REDIRECT_URI ?? "",
    }),
  });

  if (!resposta.ok) {
    return NextResponse.json(
      { erro: `Falha ao trocar o code pelo token (HTTP ${resposta.status}).` },
      { status: 502 }
    );
  }

  const dados = (await resposta.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await salvarCredencialInicial(dados.access_token, dados.refresh_token, dados.expires_in);

  return NextResponse.json({ conectado: true });
}
