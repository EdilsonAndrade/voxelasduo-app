import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ProdutoCard from "@/components/produtos/ProdutoCard";
import { listarProdutos } from "@/lib/produtos/repository";
import {
  buscarCategoriaPorSlug,
  listarCategoriasComProdutos,
  resolverRedirecionamentoCategoria,
} from "@/lib/categorias/repository";
import { decodificarSegmentoRota } from "@/lib/produtos/slug";
import styles from "@/components/produtos/produtos.module.css";

export default async function ProdutosPorCategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { categoria: categoriaParam } = await params;
  const slugCategoria = decodificarSegmentoRota(categoriaParam);
  const { q } = await searchParams;
  const categoria = await buscarCategoriaPorSlug(slugCategoria);

  // Endereço antigo (texto livre legado, variação de digitação ou categoria removida) → categoria atual (EDI-123).
  if (!categoria) {
    const destino = await resolverRedirecionamentoCategoria(slugCategoria);
    if (destino) permanentRedirect(`/produtos/${destino}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    notFound();
  }

  const [produtos, categorias] = await Promise.all([
    listarProdutos({ categoria: categoria.slug, q }),
    listarCategoriasComProdutos(),
  ]);

  return (
    <div className="container">
      <div className={styles.hero}>
        <p className={styles.eyebrow}>catálogo impresso sob demanda</p>
        <h1>{categoria.nome}</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.cats}>
          <Link href="/produtos" className={styles.catChip}>
            Todas
          </Link>
          {categorias.map((c) => (
            <Link
              key={c.slug}
              href={`/produtos/${c.slug}`}
              className={c.slug === categoria.slug ? styles.catChipActive : styles.catChip}
            >
              {c.nome}
            </Link>
          ))}
        </div>
        <form className={styles.search} action={`/produtos/${categoria.slug}`}>
          <input type="search" name="q" placeholder="buscar produto…" defaultValue={q ?? ""} />
        </form>
      </div>

      <div className={styles.grid}>
        {produtos.length === 0 ? (
          <p className={styles.empty}>Nenhum produto encontrado nesta categoria.</p>
        ) : (
          produtos.map((produto) => (
            <ProdutoCard key={produto._id?.toString()} produto={produto} categoriaNome={categoria.nome} />
          ))
        )}
      </div>
    </div>
  );
}
