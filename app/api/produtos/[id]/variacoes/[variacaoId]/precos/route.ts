import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { PrecosCanaisProduto } from "@/lib/models/produto";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { buscarVariacao } from "@/lib/produtos/variacoes";
import { aplicarPrecosVariacao } from "@/lib/produtos/variacoesRepository";

type Params = { params: Promise<{ id: string; variacaoId: string }> };

function precoValido(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0;
}

/** Aplica na variação os preços calculados na calculadora (specs/041, FR-012). */
export async function PATCH(request: Request, { params }: Params) {
  const { id, variacaoId } = await params;
  const produto = await buscarProdutoPorId(id);
  if (!produto || !buscarVariacao(produto, variacaoId)) {
    return NextResponse.json({ erro: "Produto ou variação não encontrados." }, { status: 404 });
  }

  const corpo = (await request.json().catch(() => null)) as { preco?: unknown; precosCanais?: unknown } | null;
  const campos: Record<string, string> = {};
  if (!precoValido(corpo?.preco)) campos.preco = "Informe o preço do site em centavos.";

  const precosCanais: PrecosCanaisProduto = {};
  const canais = (corpo?.precosCanais && typeof corpo.precosCanais === "object" ? corpo.precosCanais : {}) as Record<string, unknown>;
  for (const canal of ["shopee", "mercadoLivre"] as const) {
    if (canais[canal] === undefined || canais[canal] === null) continue;
    if (precoValido(canais[canal])) precosCanais[canal] = canais[canal];
    else campos[`precosCanais.${canal}`] = "Preço do canal inválido.";
  }
  if (Object.keys(campos).length > 0) {
    return NextResponse.json({ erro: "Payload inválido.", campos }, { status: 400 });
  }

  const atualizado = await aplicarPrecosVariacao(id, variacaoId, corpo!.preco as number, precosCanais);
  if (!atualizado) {
    return NextResponse.json({ erro: "Produto ou variação não encontrados." }, { status: 404 });
  }
  revalidatePath("/produtos", "layout");
  return NextResponse.json({ produto: atualizado });
}
