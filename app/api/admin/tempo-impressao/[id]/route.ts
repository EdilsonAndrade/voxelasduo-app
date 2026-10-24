import { NextResponse } from "next/server";
import { validarItens, validarNomeAvulso } from "@/lib/producao/planosImpressao";
import {
  atualizarPlano,
  buscarPlano,
  excluirPlano,
  vincularProduto,
} from "@/lib/producao/planosImpressaoRepository";
import { buscarProdutoPorId } from "@/lib/produtos/repository";

type Contexto = { params: Promise<{ id: string }> };

const NAO_ENCONTRADO = "Item não está no Tempo de Impressão.";

/** Substitui a lista inteira (edição, remoção de linhas) e, no item avulso, o nome. */
export async function PUT(request: Request, { params }: Contexto) {
  const { id } = await params;
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const { itens, erro } = validarItens(corpo?.itens);
  if (!itens) return NextResponse.json({ erro }, { status: 400 });

  const atual = await buscarPlano(id);
  if (!atual) return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });

  let nome: string | undefined;
  if (!atual.produtoId && corpo?.nome !== undefined) {
    const validado = validarNomeAvulso(corpo.nome);
    if (!validado.nome) return NextResponse.json({ erro: validado.erro }, { status: 400 });
    nome = validado.nome;
  }

  const plano = await atualizarPlano(id, { itens, ...(nome ? { nome } : {}) });
  if (!plano) return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });
  return NextResponse.json({ plano });
}

/** `{ produtoId }`: o item avulso virou produto (criado pelo "Novo produto" ou pela calculadora). */
export async function PATCH(request: Request, { params }: Contexto) {
  const { id } = await params;
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const produtoId = typeof corpo?.produtoId === "string" ? corpo.produtoId : "";
  if (!produtoId) return NextResponse.json({ erro: "Informe o produto." }, { status: 400 });

  if (!(await buscarProdutoPorId(produtoId))) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  const plano = await vincularProduto(id, produtoId);
  if (plano === "ocupado") {
    return NextResponse.json({ erro: "Este produto já tem outro item no Tempo de Impressão." }, { status: 409 });
  }
  if (!plano) return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });
  return NextResponse.json({ plano });
}

/** Tira do menu — o produto do catálogo, se houver, não muda. */
export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params;
  const excluido = await excluirPlano(id);
  if (!excluido) return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });
  return NextResponse.json({ ok: true });
}
