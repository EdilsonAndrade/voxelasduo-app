import { NextResponse } from "next/server";
import { buscarConfigFrete, salvarConfigFrete } from "@/lib/frete/repository";
import { validarConfigFrete } from "@/lib/frete/validation";
import type { FreteConfig } from "@/lib/models/frete";

/** Valores fixos do frete do site (spec 039) — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  const config = await buscarConfigFrete();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const payload = await request.json().catch(() => null);
  const erros = validarConfigFrete(payload);

  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Payload inválido.", campos: erros }, { status: 400 });
  }

  const salvo = await salvarConfigFrete(payload as FreteConfig);
  return NextResponse.json(salvo);
}
