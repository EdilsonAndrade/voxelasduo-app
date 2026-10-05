import { NextResponse } from "next/server";
import { listarImportacoes } from "@/lib/producao/repository";

/** Últimas execuções da importação, para o aviso na tela (FR-011). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limite = Number(searchParams.get("limite"));

  const importacoes = await listarImportacoes(
    Number.isInteger(limite) && limite > 0 ? limite : 5
  );
  return NextResponse.json({ importacoes });
}
