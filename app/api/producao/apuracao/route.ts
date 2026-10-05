import { NextResponse } from "next/server";
import { apurarTodos } from "@/lib/producao/consulta";

/**
 * Apuração de custo e indicadores por produto (FR-019 a FR-026). Só leitura:
 * nenhum cadastro é alterado aqui (FR-028).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const produtoId = searchParams.get("produtoId") ?? undefined;

  const { produtos, resumo } = await apurarTodos({ produtoId });
  return NextResponse.json({ produtos, resumo });
}
