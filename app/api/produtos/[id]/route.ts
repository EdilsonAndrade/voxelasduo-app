import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  atualizarProduto,
  buscarProdutoPorId,
  moverProdutoDeCategoria,
  removerProduto,
} from "@/lib/produtos/repository";
import { slugCategoriaValido } from "@/lib/categorias/repository";
import { SLUG_CATEGORIA_PADRAO } from "@/lib/models/categoria";
import { gerarSlug } from "@/lib/produtos/slug";
import { removerFotoProduto } from "@/lib/storage/blob";
import { validarProduto, type ProdutoPayload } from "@/lib/produtos/validation";
import { sincronizarAnuncioProduto } from "@/lib/estoque/sincronizacao";
import { despublicarAnuncio } from "@/lib/estoque/canais/mercadoLivre/anuncios";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);

  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ produto });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const produtoAtual = await buscarProdutoPorId(id);

  if (!produtoAtual) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  const payload = (await request.json()) as ProdutoPayload;
  const erros = validarProduto(payload, { parcial: true });

  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Payload inválido.", campos: erros }, { status: 400 });
  }

  const { categoria: categoriaPayload, ...dados } = payload as Record<string, unknown>;

  // Categoria vazia = "Diversos"; só categorias cadastradas são aceitas (EDI-123).
  let categoriaDestino = produtoAtual.categoria;
  if (typeof categoriaPayload === "string") {
    categoriaDestino = categoriaPayload.trim() || SLUG_CATEGORIA_PADRAO;
    if (!(await slugCategoriaValido(categoriaDestino))) {
      return NextResponse.json(
        { erro: "Payload inválido.", campos: { categoria: "Escolha uma categoria cadastrada." } },
        { status: 400 }
      );
    }
  }

  const slugBase =
    typeof payload.nome === "string" && payload.nome !== produtoAtual.nome
      ? gerarSlug(payload.nome)
      : produtoAtual.slug;

  // Troca de categoria e/ou slug: resolve conflito no destino e redireciona o endereço antigo (EDI-123).
  const enderecoMudou = categoriaDestino !== produtoAtual.categoria || slugBase !== produtoAtual.slug;
  if (enderecoMudou) {
    await moverProdutoDeCategoria(produtoAtual, categoriaDestino, slugBase);
  }

  const produto = await atualizarProduto(id, dados);

  if (enderecoMudou) {
    revalidatePath("/");
    revalidatePath("/produtos", "layout");
  }

  // Mantém o anúncio já publicado (Tarefa 7/EDI-80) refletindo preço,
  // estoque e descrição após uma edição no admin — best-effort, nunca trava
  // a resposta do PATCH. Nome, categoria e fotos não têm um endpoint de
  // atualização "in place" tão direto na API do Mercado Livre — quem quiser
  // refletir essas mudanças no anúncio precisa despublicar e publicar de novo.
  const mercadoLivreId = produto?.integracoes?.mercadoLivreId;
  const precoOuEstoqueMudou =
    "preco" in payload || "estoque" in payload || "precosCanais" in payload;
  const descricaoMudou =
    typeof payload.descricao === "string" && payload.descricao !== produtoAtual.descricao;
  if (produto && mercadoLivreId && (precoOuEstoqueMudou || descricaoMudou)) {
    sincronizarAnuncioProduto(id, undefined, { sincronizarDescricao: descricaoMudou }).catch(
      () => undefined
    );
  }

  return NextResponse.json({ produto });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);

  if (!produto) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }

  // Remover um produto publicado sem despublicar deixaria o anúncio órfão e
  // vendável no Mercado Livre — despublica primeiro e só remove o produto se
  // isso funcionar (o admin já foi avisado disso antes de confirmar).
  const mercadoLivreId = produto.integracoes?.mercadoLivreId;
  if (mercadoLivreId) {
    try {
      await despublicarAnuncio(mercadoLivreId);
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : "Erro desconhecido";
      return NextResponse.json(
        { erro: `Não foi possível despublicar do Mercado Livre antes de remover: ${motivo}` },
        { status: 422 }
      );
    }
  }

  await Promise.all(produto.fotos.map((url) => removerFotoProduto(url).catch(() => undefined)));
  await removerProduto(id);
  // O produto pode estar em carrosséis da home (EDI-114).
  revalidatePath("/");

  return new NextResponse(null, { status: 204 });
}
