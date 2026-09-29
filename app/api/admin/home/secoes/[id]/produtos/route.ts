import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { buscarSecao, definirProdutosCarrossel } from "@/lib/home/repository";
import { listarProdutosPorIds } from "@/lib/produtos/repository";

type Params = { params: Promise<{ id: string }> };

/** Define a lista (e a ordem) dos produtos do carrossel. */
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const secao = await buscarSecao(id);

  if (!secao) return NextResponse.json({ erro: "Seção não encontrada." }, { status: 404 });
  if (secao.tipo !== "carrossel") {
    return NextResponse.json({ erro: "Só carrosséis têm produtos." }, { status: 400 });
  }

  const corpo = (await request.json().catch(() => null)) as { produtoIds?: unknown } | null;
  const ids = corpo?.produtoIds;

  if (
    !Array.isArray(ids) ||
    !ids.every((pid) => typeof pid === "string" && ObjectId.isValid(pid)) ||
    new Set(ids).size !== ids.length
  ) {
    return NextResponse.json({ erro: "Envie { produtoIds: string[] } sem repetição." }, { status: 400 });
  }

  const objectIds = (ids as string[]).map((pid) => new ObjectId(pid));
  const existentes = await listarProdutosPorIds(objectIds);
  if (existentes.length !== objectIds.length) {
    return NextResponse.json({ erro: "Um ou mais produtos não existem mais." }, { status: 404 });
  }

  const atualizada = await definirProdutosCarrossel(id, objectIds);
  revalidatePath("/");
  return NextResponse.json({ secao: atualizada });
}
