import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { buscarSecao, desmarcarProduto, marcarProduto } from "@/lib/home/repository";
import { buscarProdutoPorId } from "@/lib/produtos/repository";

type Params = { params: Promise<{ id: string; produtoId: string }> };

/** Valida seção (carrossel) e produto; devolve a resposta de erro ou o `_id` do produto. */
async function validar(id: string, produtoId: string) {
  const secao = await buscarSecao(id);
  if (!secao) return { erro: NextResponse.json({ erro: "Seção não encontrada." }, { status: 404 }) };
  if (secao.tipo !== "carrossel") {
    return { erro: NextResponse.json({ erro: "Só carrosséis têm produtos." }, { status: 400 }) };
  }

  const produto = await buscarProdutoPorId(produtoId);
  if (!produto) return { erro: NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 }) };

  return { produtoObjectId: produto._id! };
}

/** Marca o produto no carrossel (idempotente). */
export async function POST(_request: Request, { params }: Params) {
  const { id, produtoId } = await params;
  const resultado = await validar(id, produtoId);
  if (resultado.erro) return resultado.erro;

  const secao = await marcarProduto(id, resultado.produtoObjectId);
  revalidatePath("/");
  return NextResponse.json({ secao });
}

/** Desmarca o produto do carrossel (idempotente). */
export async function DELETE(_request: Request, { params }: Params) {
  const { id, produtoId } = await params;
  const resultado = await validar(id, produtoId);
  if (resultado.erro) return resultado.erro;

  const secao = await desmarcarProduto(id, resultado.produtoObjectId);
  revalidatePath("/");
  return NextResponse.json({ secao });
}
