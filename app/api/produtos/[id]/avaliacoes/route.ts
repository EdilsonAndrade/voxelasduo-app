import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { buscarAvaliacoesProduto } from "@/lib/avaliacoes/repository";

type Params = { params: Promise<{ id: string }> };

/** Lista paginada de avaliações de um produto, mais recentes primeiro (contracts/avaliacoes-api.md, FR-011). */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ avaliacoes: [], proximoCursor: null });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limiteParam = searchParams.get("limite");
  const limite = limiteParam ? Number(limiteParam) : undefined;

  const pagina = await buscarAvaliacoesProduto(new ObjectId(id), {
    cursor,
    limite: limite && Number.isFinite(limite) ? limite : undefined,
  });

  return NextResponse.json({
    avaliacoes: pagina.avaliacoes.map((avaliacao) => ({
      canal: avaliacao.canal,
      nota: avaliacao.nota,
      comentario: avaliacao.comentario ?? null,
      dataAvaliacao: avaliacao.dataAvaliacao,
    })),
    proximoCursor: pagina.proximoCursor,
  });
}
