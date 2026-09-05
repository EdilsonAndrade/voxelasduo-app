import { NextResponse } from "next/server";
import { criarProduto, listarProdutos, slugDisponivel } from "@/lib/produtos/repository";
import { gerarSlug } from "@/lib/produtos/slug";
import { validarProduto, type ProdutoPayload } from "@/lib/produtos/validation";
import type { IntegracoesCanal } from "@/lib/models/produto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const categoria = searchParams.get("categoria") ?? undefined;

  const produtos = await listarProdutos({ q, categoria });
  return NextResponse.json({ produtos });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ProdutoPayload;
  const erros = validarProduto(payload);

  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Payload inválido.", campos: erros }, { status: 400 });
  }

  const nome = payload.nome as string;
  const categoria = payload.categoria as string;
  let slug = gerarSlug(nome);

  if (!(await slugDisponivel(categoria, slug))) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const produto = await criarProduto({
    nome,
    slug,
    descricao: payload.descricao as string,
    preco: payload.preco as number,
    estoque: payload.estoque as number,
    categoria,
    fotos: payload.fotos as string[],
    integracoes: payload.integracoes as IntegracoesCanal | undefined,
  });

  return NextResponse.json({ produto }, { status: 201 });
}
