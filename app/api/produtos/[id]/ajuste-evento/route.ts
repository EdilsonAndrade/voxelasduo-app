import { NextResponse } from "next/server";
import type { PrecosCanaisProduto } from "@/lib/models/produto";
import {
  aplicarAjusteEvento,
  buscarProdutoPorId,
  restaurarAjusteEvento,
} from "@/lib/produtos/repository";
import { percentualAjusteValido } from "@/lib/produtos/precoLista";
import { validarProduto } from "@/lib/produtos/validation";
import { sincronizarAnuncioProduto } from "@/lib/estoque/sincronizacao";

type Params = { params: Promise<{ id: string }> };

/** Mantém o anúncio do Mercado Livre com o preço novo — best-effort, como no PATCH do produto. */
function sincronizarMercadoLivre(id: string, mercadoLivreId: string | undefined) {
  if (!mercadoLivreId) return;
  sincronizarAnuncioProduto(id, undefined).catch(() => undefined);
}

/**
 * Aplica o ajuste de preços do evento (EDI-126): grava os preços já
 * calculados na lista do admin e guarda os anteriores para restaurar depois.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const corpo = (await request.json().catch(() => null)) as {
    percentual?: unknown;
    preco?: unknown;
    precosCanais?: unknown;
  } | null;

  if (!corpo || typeof corpo.percentual !== "number" || !percentualAjusteValido(corpo.percentual)) {
    return NextResponse.json(
      { erro: "Payload inválido.", campos: { percentual: "Informe um percentual de 1 a 90." } },
      { status: 400 }
    );
  }

  const precosCanais = corpo.precosCanais ?? {};
  const erros = validarProduto({ preco: corpo.preco, precosCanais }, { parcial: true });
  if (corpo.preco === undefined) erros.preco = "O preço deve ser maior que zero.";
  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Payload inválido.", campos: erros }, { status: 400 });
  }

  const produto = await aplicarAjusteEvento(id, {
    percentual: corpo.percentual,
    preco: corpo.preco as number,
    precosCanais: precosCanais as PrecosCanaisProduto,
  });

  if (!produto) {
    const existente = await buscarProdutoPorId(id);
    if (!existente) {
      return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
    }
    return NextResponse.json(
      { erro: "Este produto já tem um ajuste do evento. Restaure os preços antes de aplicar outro." },
      { status: 409 }
    );
  }

  sincronizarMercadoLivre(id, produto.integracoes?.mercadoLivreId);
  return NextResponse.json({ produto });
}

/** Restaura os preços de antes do ajuste do evento (EDI-126). */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await restaurarAjusteEvento(id);

  if (!produto) {
    const existente = await buscarProdutoPorId(id);
    if (!existente) {
      return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ erro: "Este produto não tem ajuste do evento ativo." }, { status: 409 });
  }

  sincronizarMercadoLivre(id, produto.integracoes?.mercadoLivreId);
  return NextResponse.json({ produto });
}
