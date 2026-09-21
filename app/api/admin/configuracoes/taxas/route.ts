import { NextResponse } from "next/server";
import { buscarTaxasCanais, salvarTaxasCanais } from "@/lib/configuracoes/repository";
import { validarTaxasCanais } from "@/lib/configuracoes/validation";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";

/** Padrão global das taxas de Shopee e site próprio (EDI-106) — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  const taxas = await buscarTaxasCanais();
  return NextResponse.json(taxas);
}

export async function PUT(request: Request) {
  const payload = await request.json().catch(() => null);
  const erros = validarTaxasCanais(payload);

  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Payload inválido.", campos: erros }, { status: 400 });
  }

  const salvo = await salvarTaxasCanais(payload as TaxasCanaisConfig);
  return NextResponse.json(salvo);
}
