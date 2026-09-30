import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { criarProduto, listarProdutos, slugLivreNaCategoria } from "@/lib/produtos/repository";
import { slugCategoriaValido } from "@/lib/categorias/repository";
import { SLUG_CATEGORIA_PADRAO } from "@/lib/models/categoria";
import { gerarSlug } from "@/lib/produtos/slug";
import { validarProduto, type ProdutoPayload } from "@/lib/produtos/validation";
import type {
  CustoProducao,
  EmbalagemEnvio,
  FichaTecnicaProduto,
  IntegracoesCanal,
  MetaCatalogoProduto,
  PrecosCanaisProduto,
  TaxasCanaisProduto,
} from "@/lib/models/produto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const categoria = searchParams.get("categoria") ?? undefined;

  const produtos = await listarProdutos({ q, categoria });
  return NextResponse.json({ produtos });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ProdutoPayload;
  const erros = validarProduto(payload);

  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Payload inválido.", campos: erros }, { status: 400 });
  }

  const nome = payload.nome as string;
  // Sem categoria escolhida, o produto vai para "Diversos"; só categorias cadastradas são aceitas (EDI-123).
  const categoria = (typeof payload.categoria === "string" && payload.categoria.trim()) || SLUG_CATEGORIA_PADRAO;
  if (!(await slugCategoriaValido(categoria))) {
    return NextResponse.json(
      { erro: "Payload inválido.", campos: { categoria: "Escolha uma categoria cadastrada." } },
      { status: 400 }
    );
  }

  const slug = await slugLivreNaCategoria(categoria, gerarSlug(nome));

  const produto = await criarProduto({
    nome,
    slug,
    descricao: payload.descricao as string,
    preco: payload.preco as number,
    estoque: payload.estoque as number,
    categoria,
    fotos: payload.fotos as string[],
    integracoes: payload.integracoes as IntegracoesCanal | undefined,
    custoProducao: payload.custoProducao as CustoProducao | undefined,
    taxasCanais: payload.taxasCanais as TaxasCanaisProduto | undefined,
    precosCanais: payload.precosCanais as PrecosCanaisProduto | undefined,
    embalagemEnvio: payload.embalagemEnvio as EmbalagemEnvio | undefined,
    fichaTecnica: payload.fichaTecnica as FichaTecnicaProduto | undefined,
    metaCatalogo: payload.metaCatalogo as MetaCatalogoProduto | undefined,
  });

  // Uma categoria que estava vazia passa a aparecer nos filtros da vitrine.
  revalidatePath("/produtos", "layout");

  return NextResponse.json({ produto }, { status: 201 });
}
