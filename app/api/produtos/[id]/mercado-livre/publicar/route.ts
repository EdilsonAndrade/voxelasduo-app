import { NextResponse } from "next/server";
import { atualizarProduto, buscarProdutoPorId } from "@/lib/produtos/repository";
import { criarAnuncio, despublicarAnuncio } from "@/lib/estoque/canais/mercadoLivre/anuncios";
import { registrarFalhaPublicacao } from "@/lib/estoque/publicacoes";

type Params = { params: Promise<{ id: string }> };

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro desconhecido";
}

/**
 * Cria o anúncio no Mercado Livre a partir do produto (US1, FR-001 a FR-004).
 * Requer que o produto ainda não tenha `integracoes.mercadoLivreId`.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);

  if (!produto || !produto._id) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  if (produto.integracoes?.mercadoLivreId) {
    return NextResponse.json(
      { erro: "Produto já publicado no Mercado Livre." },
      { status: 409 }
    );
  }

  // O corpo é opcional: o admin envia a categoria escolhida no seletor, que
  // pode ainda não ter sido salva no produto (botão "Salvar" não clicado).
  const corpo = (await request.json().catch(() => ({}))) as {
    mercadoLivreCategoriaId?: unknown;
    mercadoLivreCategoriaCaminho?: unknown;
    mercadoLivreTipoAnuncio?: unknown;
  };
  const categoriaId =
    typeof corpo.mercadoLivreCategoriaId === "string" ? corpo.mercadoLivreCategoriaId.trim() : "";
  const categoriaCaminho =
    typeof corpo.mercadoLivreCategoriaCaminho === "string"
      ? corpo.mercadoLivreCategoriaCaminho.trim()
      : "";
  if (categoriaId) {
    produto.integracoes = {
      ...produto.integracoes,
      mercadoLivreCategoriaId: categoriaId,
      mercadoLivreCategoriaCaminho: categoriaCaminho || undefined,
    };
  }
  if (corpo.mercadoLivreTipoAnuncio === "gold_special" || corpo.mercadoLivreTipoAnuncio === "gold_pro") {
    produto.integracoes = {
      ...produto.integracoes,
      mercadoLivreTipoAnuncio: corpo.mercadoLivreTipoAnuncio,
    };
  }

  try {
    const { id: mercadoLivreId, permalink: mercadoLivrePermalink } = await criarAnuncio(produto);
    await atualizarProduto(id, {
      integracoes: { ...produto.integracoes, mercadoLivreId, mercadoLivrePermalink },
    });
    return NextResponse.json({ mercadoLivreId, mercadoLivrePermalink }, { status: 201 });
  } catch (erro) {
    const motivo = mensagemErro(erro);
    await registrarFalhaPublicacao(produto._id, "mercado_livre", "criar", motivo);
    return NextResponse.json({ erro: motivo }, { status: 422 });
  }
}

/**
 * Despublica (fecha) o anúncio no Mercado Livre e limpa
 * `produto.integracoes.mercadoLivreId`, liberando o produto para ser
 * publicado de novo. Usado para desfazer uma publicação de teste.
 */
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
    await despublicarAnuncio(mercadoLivreId);
  } catch (erro) {
    return NextResponse.json({ erro: mensagemErro(erro) }, { status: 422 });
  }

  // O driver do MongoDB grava `undefined` como `null` (não remove o campo) —
  // suficiente aqui, pois todo ponto que lê `integracoes.mercadoLivreId`
  // trata o valor como "ausente" (checagem de truthy), tanto `null` quanto
  // string vazia.
  await atualizarProduto(id, {
    integracoes: {
      ...produto.integracoes,
      mercadoLivreId: undefined,
      mercadoLivrePermalink: undefined,
    },
  });

  return NextResponse.json({ despublicado: true });
}
