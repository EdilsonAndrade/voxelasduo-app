import { NextResponse } from "next/server";
import { buscarKitDetalhe, excluirKit, salvarKit } from "@/lib/kits/repository";
import { validarKit } from "@/lib/kits/validation";
import { respostaDeErroKit } from "@/lib/kits/respostaErro";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const kit = await buscarKitDetalhe(id);
  if (!kit) return NextResponse.json({ erro: "Kit não encontrado." }, { status: 404 });
  return NextResponse.json({ kit });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const { dados, erro } = validarKit(await request.json().catch(() => null));
  if (!dados) return NextResponse.json({ erro }, { status: 400 });

  try {
    return NextResponse.json(await salvarKit(id, dados));
  } catch (falha) {
    return respostaDeErroKit(falha);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!(await excluirKit(id))) return NextResponse.json({ erro: "Kit não encontrado." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
