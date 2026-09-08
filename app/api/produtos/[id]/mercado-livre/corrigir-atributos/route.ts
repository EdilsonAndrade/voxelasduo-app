import { NextResponse } from "next/server";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { atualizarAtributosAnuncio } from "@/lib/estoque/canais/mercadoLivre/anuncios";

type Params = { params: Promise<{ id: string }> };

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro desconhecido";
}

/**
 * Reaplica os atributos corrigidos (Marca/Modelo — EDI-95 — e/ou peso/
 * dimensões de embalagem — EDI-96) num anúncio já publicado, sem
 * despublicar/republicar (contracts/corrigir-atributos.md). Segue o mesmo
 * padrão de status HTTP já usado em `mercado-livre/publicar/route.ts`: 409
 * para estado inválido do produto, 422 para falha de comunicação com o
 * Mercado Livre.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);

  if (!produto) {
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
    await atualizarAtributosAnuncio(mercadoLivreId, produto);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return NextResponse.json(
      { erro: `Falha ao corrigir atributos no Mercado Livre: ${mensagemErro(erro)}` },
      { status: 422 }
    );
  }
}
