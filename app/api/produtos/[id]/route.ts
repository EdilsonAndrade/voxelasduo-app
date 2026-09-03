import { NextResponse } from "next/server";
import {
  atualizarProduto,
  buscarProdutoPorId,
  removerProduto,
  slugDisponivel,
} from "@/lib/produtos/repository";
import { gerarSlug } from "@/lib/produtos/slug";
import { removerFotoProduto } from "@/lib/storage/blob";
import { validarProduto, type ProdutoPayload } from "@/lib/produtos/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);

  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ produto });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const produtoAtual = await buscarProdutoPorId(id);

  if (!produtoAtual) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  const payload = (await request.json()) as ProdutoPayload;
  const erros = validarProduto(payload, { parcial: true });

  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Payload inválido.", campos: erros }, { status: 400 });
  }

  const dados: Record<string, unknown> = { ...payload };

  if (typeof payload.nome === "string" && payload.nome !== produtoAtual.nome) {
    const categoria = (payload.categoria as string) ?? produtoAtual.categoria;
    let novoSlug = gerarSlug(payload.nome);
    if (!(await slugDisponivel(categoria, novoSlug, id))) {
      novoSlug = `${novoSlug}-${Date.now().toString(36)}`;
    }
    dados.slug = novoSlug;
  }

  const produto = await atualizarProduto(id, dados);
  return NextResponse.json({ produto });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);

  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  await Promise.all(produto.fotos.map((url) => removerFotoProduto(url).catch(() => undefined)));
  await removerProduto(id);

  return new NextResponse(null, { status: 204 });
}
