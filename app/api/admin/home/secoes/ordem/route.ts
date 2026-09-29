import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { OrdemInvalidaError, reordenarSecoes } from "@/lib/home/repository";

export async function PUT(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = corpo?.ids;

  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ erro: "Envie { ids: string[] }." }, { status: 400 });
  }

  try {
    const secoes = await reordenarSecoes(ids);
    revalidatePath("/");
    return NextResponse.json({ secoes });
  } catch (erro) {
    if (erro instanceof OrdemInvalidaError) {
      return NextResponse.json({ erro: erro.message }, { status: 400 });
    }
    throw erro;
  }
}
