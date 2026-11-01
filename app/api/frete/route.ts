import { NextResponse } from "next/server";
import { opcoesFreteVigentes } from "@/lib/frete/repository";

/**
 * Opções de entrega do checkout (spec 039) — rota pública, como o checkout.
 * Recebe `{ cep, itens }` (usados quando houver cálculo por CEP/peso).
 */
export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { cep?: unknown } | null;
  const cep = typeof corpo?.cep === "string" ? corpo.cep : undefined;
  const opcoes = await opcoesFreteVigentes({ cep });
  return NextResponse.json({ opcoes });
}
