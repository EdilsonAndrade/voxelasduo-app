import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarProdutoPorCategoriaESlug } from "@/lib/produtos/repository";
import { formatarPreco } from "@/lib/produtos/formato";
import BotaoAdicionarCarrinho from "@/components/carrinho/BotaoAdicionarCarrinho";
import styles from "@/components/produtos/produtos.module.css";

export default async function ProdutoDetalhePage({
  params,
}: {
  params: Promise<{ categoria: string; slug: string }>;
}) {
  const { categoria, slug } = await params;
  const produto = await buscarProdutoPorCategoriaESlug(categoria, slug);

  if (!produto) {
    notFound();
  }

  const semEstoque = produto.estoque === 0;

  return (
    <div className="container">
      <p className={styles.crumb}>
        <Link href="/produtos">Produtos</Link> ›{" "}
        <Link href={`/produtos/${produto.categoria}`}>{produto.categoria}</Link> › {produto.nome}
      </p>

      <div className={styles.detail}>
        <div>
          <div className={styles.galleryMain}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={produto.fotos[0]} alt={produto.nome} />
          </div>
          {produto.fotos.length > 1 && (
            <div className={styles.thumbs}>
              {produto.fotos.map((foto) => (
                <div className={styles.thumb} key={foto}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.detailInfo}>
          <h1>{produto.nome}</h1>
          <div className={styles.detailPrice}>{formatarPreco(produto.preco)}</div>
          <p className={styles.detailDesc}>{produto.descricao}</p>

          <div className={styles.datasheet}>
            <div className={styles.datasheetTitle}>ficha técnica</div>
            <dl>
              <dt>categoria</dt>
              <dd>{produto.categoria}</dd>
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
    </div>
  );
}
