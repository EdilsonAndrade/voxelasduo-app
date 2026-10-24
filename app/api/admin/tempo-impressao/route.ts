import { NextResponse } from "next/server";
import { validarItens } from "@/lib/producao/planosImpressao";
import { criarPlano, listarPlanos, mesclarPlano } from "@/lib/producao/planosImpressaoRepository";
import { buscarProdutoPorId } from "@/lib/produtos/repository";

/** Tempo de Impressão (specs/035) — protegido pelo proxy `/api/admin/*`. */
export async function GET() {
  const planos = await listarPlanos();
  return NextResponse.json({ planos });
}

/** `modo: "criar"` (padrão, 409 se o produto já está no menu) ou `"mesclar"` (importação da Produção). */
export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!corpo || typeof corpo !== "object") return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });

  const produtoId = typeof corpo.produtoId === "string" ? corpo.produtoId : "";
  if (!produtoId) return NextResponse.json({ erro: "Escolha o produto." }, { status: 400 });
  const modo = corpo.modo ?? "criar";
  if (modo !== "criar" && modo !== "mesclar") {
    return NextResponse.json({ erro: "Modo inválido." }, { status: 400 });
  }

  const { itens, erro } = validarItens(corpo.itens);
  if (!itens) return NextResponse.json({ erro }, { status: 400 });

  if (!(await buscarProdutoPorId(produtoId))) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  if (modo === "mesclar") {
    const { plano, criado } = await mesclarPlano(produtoId, itens);
    return NextResponse.json({ plano }, { status: criado ? 201 : 200 });
  }

  const plano = await criarPlano(produtoId, itens);
  if (!plano) {
    return NextResponse.json({ erro: "Este produto já está no Tempo de Impressão.", produtoId }, { status: 409 });
  }
  return NextResponse.json({ plano }, { status: 201 });
}
