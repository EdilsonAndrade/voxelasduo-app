import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { validarVariacoes } from "@/lib/produtos/variacoes";
import { ErroVariacoes, salvarVariacoes } from "@/lib/produtos/variacoesRepository";

type Params = { params: Promise<{ id: string }> };

/** Substitui as variações de kit do produto (specs/041) — contrato em specs/041-kit-variacoes/contracts/api.md. */
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);
  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  const corpo = (await request.json().catch(() => null)) as { variacoes?: unknown } | null;
  const { erros, variacoes } = validarVariacoes(corpo?.variacoes, produto.fotos, id);
  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Payload inválido.", campos: erros }, { status: 400 });
  }

  try {
    const atualizado = await salvarVariacoes(id, variacoes);
    if (!atualizado) {
      return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
    }
    revalidatePath("/");
    revalidatePath("/produtos", "layout");
    return NextResponse.json({ produto: atualizado });
  } catch (erro) {
    if (erro instanceof ErroVariacoes) {
      return NextResponse.json({ erro: "Payload inválido.", campos: erro.campos }, { status: 400 });
    }
    throw erro;
  }
}
