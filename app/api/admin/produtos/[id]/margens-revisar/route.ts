import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { removerMargensParaRevisar } from "@/lib/produtos/repository";

type Params = { params: Promise<{ id: string }> };

/** "Marcar revisado" (spec 034): tira o produto da lista de margens antigas para revisar. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ erro: "Id de produto inválido." }, { status: 400 });
  }

  const encontrado = await removerMargensParaRevisar(id);
  if (!encontrado) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
