import { NextResponse } from "next/server";
import { atualizarProduto, buscarProdutoPorId } from "@/lib/produtos/repository";
import { pausarAnuncio, reativarAnuncio } from "@/lib/estoque/canais/mercadoLivre/anuncios";

type Params = { params: Promise<{ id: string }> };

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro desconhecido";
}

/**
 * Pausa o anúncio já publicado no Mercado Livre, sem despublicar (mantém
 * `integracoes.mercadoLivreId`) — diferente de `DELETE .../publicar`, que
 * fecha o anúncio. Reversível via `DELETE` desta mesma rota.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);

  if (!produto || !produto._id) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  const mercadoLivreId = produto.integracoes?.mercadoLivreId;
  if (!mercadoLivreId) {
    return NextResponse.json(
      { erro: "Produto não está publicado no Mercado Livre." },
      { status: 409 }
    );
  }

  try {
    await pausarAnuncio(mercadoLivreId);
  } catch (erro) {
    return NextResponse.json({ erro: mensagemErro(erro) }, { status: 422 });
  }

  await atualizarProduto(id, {
    integracoes: { ...produto.integracoes, mercadoLivrePausado: true },
  });

  return NextResponse.json({ pausado: true });
}

/** Reativa um anúncio pausado — inverso de `POST` desta mesma rota. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);

  if (!produto || !produto._id) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  const mercadoLivreId = produto.integracoes?.mercadoLivreId;
  if (!mercadoLivreId) {
    return NextResponse.json(
      { erro: "Produto não está publicado no Mercado Livre." },
      { status: 409 }
    );
  }

  try {
    await reativarAnuncio(mercadoLivreId);
  } catch (erro) {
    return NextResponse.json({ erro: mensagemErro(erro) }, { status: 422 });
  }

  await atualizarProduto(id, {
    integracoes: { ...produto.integracoes, mercadoLivrePausado: false },
  });

  return NextResponse.json({ pausado: false });
}
