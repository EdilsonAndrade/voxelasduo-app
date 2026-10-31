import { NextResponse } from "next/server";
import { hojeIso } from "@/lib/controleVendas/formato";
import { criarRomaneio, listarRomaneios } from "@/lib/romaneios/repository";
import { validarRomaneio } from "@/lib/romaneios/validation";

/** Romaneios de consignação (specs/038) — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  return NextResponse.json({ romaneios: await listarRomaneios() });
}

export async function POST(request: Request) {
  const { dados, erro } = validarRomaneio(await request.json().catch(() => null), hojeIso());
  if (!dados) return NextResponse.json({ erro }, { status: 400 });
  return NextResponse.json({ romaneio: await criarRomaneio(dados) }, { status: 201 });
}
