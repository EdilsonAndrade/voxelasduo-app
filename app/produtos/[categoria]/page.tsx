import Link from "next/link";
import ProdutoCard from "@/components/produtos/ProdutoCard";
import { listarCategorias, listarProdutos } from "@/lib/produtos/repository";
import styles from "@/components/produtos/produtos.module.css";

export default async function ProdutosPorCategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { categoria } = await params;
  const { q } = await searchParams;
  const [produtos, categorias] = await Promise.all([
    listarProdutos({ categoria, q }),
    listarCategorias(),
  ]);

  return (
    <div className="container">
      <div className={styles.hero}>
        <p className={styles.eyebrow}>catálogo impresso sob demanda</p>
        <h1>{categoria}</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.cats}>
          <Link href="/produtos" className={styles.catChip}>
            Todas
          </Link>
          {categorias.map((c) => (
            <Link
              key={c}
              href={`/produtos/${c}`}
              className={c === categoria ? styles.catChipActive : styles.catChip}
            >
              {c}
            </Link>
          ))}
        </div>
        <form className={styles.search} action={`/produtos/${categoria}`}>
          <input type="search" name="q" placeholder="buscar produto…" defaultValue={q ?? ""} />
        </form>
      </div>

      <div className={styles.grid}>
        {produtos.length === 0 ? (
          <p className={styles.empty}>Nenhum produto encontrado nesta categoria.</p>
        ) : (
          produtos.map((produto) => <ProdutoCard key={produto._id?.toString()} produto={produto} />)
        )}
      </div>
    </div>
  );
}
