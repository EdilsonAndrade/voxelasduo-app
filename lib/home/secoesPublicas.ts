import type { ObjectId } from "mongodb";
import { listarSecoesAtivas } from "@/lib/home/repository";
import { listarProdutosPorIds } from "@/lib/produtos/repository";
import { estaPublicado } from "@/lib/produtos/publicacao";
import type { Produto } from "@/lib/models/produto";
import type { SecaoBanner, SecaoCarrossel, SecaoTextoDestaque } from "@/lib/models/secaoHome";

/** Dados mínimos (e serializáveis) de um produto para o card do carrossel. */
export interface ProdutoCarrossel {
  id: string;
  nome: string;
  preco: number;
  foto?: string;
  href: string;
  esgotado: boolean;
}

export type SecaoPublica =
  | { id: string; tipo: SecaoBanner["tipo"]; secao: SecaoBanner }
  | { id: string; tipo: "textoDestaque"; secao: SecaoTextoDestaque }
  | {
      id: string;
      tipo: "carrossel";
      titulo: string;
      linkVerTudo?: string;
      produtos: ProdutoCarrossel[];
    };

export function paraProdutoCarrossel(produto: Produto): ProdutoCarrossel {
  return {
    id: produto._id!.toString(),
    nome: produto.nome,
    preco: produto.preco,
    foto: produto.fotos[0],
    href: `/produtos/${produto.categoria}/${produto.slug}`,
    esgotado: produto.estoque <= 0,
  };
}

/**
 * Seções ativas da home, na ordem do admin, prontas para renderizar (EDI-114).
 * Carrosséis: produtos na ordem de `produtoIds`, sem ids órfãos, cortados em
 * `limite`; carrossel que fica vazio é omitido (a home nunca mostra seção vazia).
 */
export async function secoesPublicas(): Promise<SecaoPublica[]> {
  const secoes = await listarSecoesAtivas();

  const carrosseis = secoes.filter((s): s is SecaoCarrossel => s.tipo === "carrossel");
  const todosIds = carrosseis.flatMap((c) => c.produtoIds ?? []);
  // Rascunho marcado num carrossel fica de fora da home até ser publicado.
  const produtos = (await listarProdutosPorIds(dedup(todosIds))).filter(estaPublicado);
  const porId = new Map(produtos.map((p) => [p._id!.toString(), p]));

  const resultado: SecaoPublica[] = [];

  for (const secao of secoes) {
    const id = secao._id!.toString();

    if (secao.tipo === "carrossel") {
      const itens = (secao.produtoIds ?? [])
        .map((pid) => porId.get(pid.toString()))
        .filter((p): p is Produto => Boolean(p))
        .slice(0, secao.limite)
        .map(paraProdutoCarrossel);

      if (itens.length === 0) continue;
      resultado.push({
        id,
        tipo: "carrossel",
        titulo: secao.titulo,
        linkVerTudo: secao.linkVerTudo,
        produtos: itens,
      });
    } else if (secao.tipo === "textoDestaque") {
      resultado.push({ id, tipo: "textoDestaque", secao });
    } else if (secao.imagemDesktop) {
      resultado.push({ id, tipo: secao.tipo, secao });
    }
  }

  return resultado;
}

function dedup(ids: ObjectId[]): ObjectId[] {
  const vistos = new Map(ids.map((id) => [id.toString(), id]));
  return [...vistos.values()];
}
