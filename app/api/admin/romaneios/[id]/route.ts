import { NextResponse } from "next/server";
import { hojeIso } from "@/lib/controleVendas/formato";
import { atualizarRomaneio, buscarRomaneio, excluirRomaneio } from "@/lib/romaneios/repository";
import { validarRomaneio } from "@/lib/romaneios/validation";

type Params = { params: Promise<{ id: string }> };

const NAO_ENCONTRADO = { erro: "Romaneio não encontrado." };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const romaneio = await buscarRomaneio(id);
  if (!romaneio) return NextResponse.json(NAO_ENCONTRADO, { status: 404 });
  return NextResponse.json({ romaneio });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const { dados, erro } = validarRomaneio(await request.json().catch(() => null), hojeIso());
  if (!dados) return NextResponse.json({ erro }, { status: 400 });
  const romaneio = await atualizarRomaneio(id, dados);
  if (!romaneio) return NextResponse.json(NAO_ENCONTRADO, { status: 404 });
  return NextResponse.json({ romaneio });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!(await excluirRomaneio(id))) return NextResponse.json(NAO_ENCONTRADO, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
