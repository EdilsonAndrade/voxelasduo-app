import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { buscarProdutoPorCategoriaESlug, buscarProdutoPorId } from "@/lib/produtos/repository";
import {
  mapaNomesCategorias,
  nomeDaCategoria,
  resolverRedirecionamentoCategoria,
} from "@/lib/categorias/repository";
import { buscarRedirecionamentoProduto } from "@/lib/categorias/redirecionamentos";
import { decodificarSegmentoRota } from "@/lib/produtos/slug";
import { formatarPreco } from "@/lib/produtos/formato";
import { buscarAvaliacoesProduto } from "@/lib/avaliacoes/repository";
import BotaoAdicionarCarrinho from "@/components/carrinho/BotaoAdicionarCarrinho";
import AvaliacoesProduto from "@/components/produtos/AvaliacoesProduto";
import GaleriaFotosProduto from "@/components/produtos/GaleriaFotosProduto";
import styles from "@/components/produtos/produtos.module.css";

// Sem `searchParams`/cookies/headers, essa página não tem nenhuma API que
// force renderização dinâmica por padrão — o Next.js a trata como estática e
// cacheia o resultado (incluindo `notFound()`), então um produto criado
// depois do primeiro acesso à URL (ou renomeado, mudando o slug) fica preso
// mostrando "não encontrado" até o próximo deploy. Catálogo pequeno, sem
// exigência de performance (specs/003-carrinho-checkout/plan.md) — forçar
// dinâmico garante que estoque/preço/existência do produto sempre refletem o
// banco na hora.
export const dynamic = "force-dynamic";

export default async function ProdutoDetalhePage({
  params,
}: {
  params: Promise<{ categoria: string; slug: string }>;
}) {
  const { categoria: categoriaParam, slug: slugParam } = await params;
  const categoria = decodificarSegmentoRota(categoriaParam);
  const slug = decodificarSegmentoRota(slugParam);
  const produto = await buscarProdutoPorCategoriaESlug(categoria, slug);

  if (!produto) {
    // Endereço antigo (troca de categoria, renomeação do produto, migração) → endereço atual (EDI-123).
    const produtoId = await buscarRedirecionamentoProduto(categoria, slug);
    let destino = produtoId ? await buscarProdutoPorId(produtoId.toString()) : null;
    if (!destino) {
      // Sem registro: tenta a categoria equivalente (alias/variação) com o mesmo slug do produto.
      const categoriaAtual = await resolverRedirecionamentoCategoria(categoria);
      destino = categoriaAtual ? await buscarProdutoPorCategoriaESlug(categoriaAtual, slug) : null;
    }
    if (destino) permanentRedirect(`/produtos/${destino.categoria}/${destino.slug}`);
    notFound();
  }

  const categoriaNome = nomeDaCategoria(await mapaNomesCategorias(), produto.categoria);

  const semEstoque = produto.estoque === 0;
  const paginaAvaliacoes = await buscarAvaliacoesProduto(produto._id!);

  return (
    <div className="container">
      <p className={styles.crumb}>
        <Link href="/produtos">Produtos</Link> ›{" "}
        <Link href={`/produtos/${produto.categoria}`}>{categoriaNome}</Link> › {produto.nome}
      </p>

      <div className={styles.detail}>
        <GaleriaFotosProduto fotos={produto.fotos} nome={produto.nome} />

        <div className={styles.detailInfo}>
          <h1>{produto.nome}</h1>
          <div className={styles.detailPrice}>{formatarPreco(produto.preco)}</div>
          <p className={styles.detailDesc}>{produto.descricao}</p>

          <div className={styles.datasheet}>
            <div className={styles.datasheetTitle}>ficha técnica</div>
            <dl>
              <dt>categoria</dt>
              <dd>{categoriaNome}</dd>
              <dt>estoque</dt>
              <dd>{semEstoque ? "esgotado" : `${produto.estoque} unidades`}</dd>
            </dl>
          </div>

          <BotaoAdicionarCarrinho
            produtoId={produto._id!.toString()}
            nome={produto.nome}
            foto={produto.fotos[0] ?? ""}
            categoria={produto.categoria}
            slug={produto.slug}
            preco={produto.preco}
            estoque={produto.estoque}
          />
        </div>
      </div>

      <AvaliacoesProduto
        produtoId={produto._id!.toString()}
        avaliacoesIniciais={paginaAvaliacoes.avaliacoes.map((avaliacao) => ({
          canal: avaliacao.canal,
          nota: avaliacao.nota,
          comentario: avaliacao.comentario ?? null,
          dataAvaliacao: avaliacao.dataAvaliacao.toISOString(),
        }))}
        cursorInicial={paginaAvaliacoes.proximoCursor}
      />
    </div>
  );
}
