import { NextResponse } from "next/server";
import {
  atualizarCalculoPreco,
  buscarCalculoPreco,
  excluirCalculoPreco,
  validarCalculoPreco,
} from "@/lib/produtos/calculosPreco";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  const { id } = await params;
  const calculo = await buscarCalculoPreco(id);
  if (!calculo) return NextResponse.json({ erro: "Cálculo não encontrado." }, { status: 404 });
  return NextResponse.json({ calculo });
}

export async function PUT(request: Request, { params }: Contexto) {
  const { id } = await params;
  const { dados, erro } = validarCalculoPreco(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro }, { status: 400 });

  const calculo = await atualizarCalculoPreco(id, dados);
  if (!calculo) return NextResponse.json({ erro: "Cálculo não encontrado." }, { status: 404 });
  return NextResponse.json({ calculo });
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params;
  const excluido = await excluirCalculoPreco(id);
  if (!excluido) return NextResponse.json({ erro: "Cálculo não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
