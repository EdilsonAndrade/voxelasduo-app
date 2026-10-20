import { NextResponse } from "next/server";
import { definirForaDoCusto } from "@/lib/producao/repository";

/**
 * Inclui ou tira uma impressão do custo apurado (ex.: placa de teste). Não
 * mexe em estoque nem em lançamentos — só no que entra na média.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const corpo = await request.json().catch(() => null);

  if (!corpo || typeof corpo.foraDoCusto !== "boolean") {
    return NextResponse.json(
      { erro: "Informe `foraDoCusto` como verdadeiro ou falso." },
      { status: 400 }
    );
  }

  const atualizada = await definirForaDoCusto(id, corpo.foraDoCusto);
  if (!atualizada) {
    return NextResponse.json({ erro: "Impressão não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ id, foraDoCusto: corpo.foraDoCusto });
}
