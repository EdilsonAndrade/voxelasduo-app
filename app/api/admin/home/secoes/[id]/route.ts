import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { atualizarSecao, buscarSecao, removerSecao } from "@/lib/home/repository";
import { dadosEditaveis } from "@/lib/home/serializacao";
import { validarSecaoHome } from "@/lib/home/validation";

type Params = { params: Promise<{ id: string }> };

const NAO_ENCONTRADA = { erro: "Seção não encontrada." };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const secao = await buscarSecao(id);

  if (!secao) return NextResponse.json(NAO_ENCONTRADA, { status: 404 });
  return NextResponse.json({ secao });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const atual = await buscarSecao(id);

  if (!atual) return NextResponse.json(NAO_ENCONTRADA, { status: 404 });

  const resultado = validarSecaoHome(await request.json(), dadosEditaveis(atual));
  if (!resultado.ok) {
    return NextResponse.json({ erro: "Payload inválido.", campos: resultado.erros }, { status: 400 });
  }

  const secao = await atualizarSecao(id, resultado.dados);
  if (!secao) return NextResponse.json(NAO_ENCONTRADA, { status: 404 });

  revalidatePath("/");
  return NextResponse.json({ secao });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  if (!(await removerSecao(id))) return NextResponse.json(NAO_ENCONTRADA, { status: 404 });

  revalidatePath("/");
  return new NextResponse(null, { status: 204 });
}
