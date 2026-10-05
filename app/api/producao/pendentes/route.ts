import { NextResponse } from "next/server";
import { agruparPendentes } from "@/lib/producao/repository";

/**
 * Nomes de arquivo ainda sem vínculo, agrupados com contagem e gramas
 * (FR-012) — é a fila de trabalho da tela de mapeamento.
 */
export async function GET() {
  const pendentes = await agruparPendentes();
  return NextResponse.json({ pendentes });
}
