import Link from "next/link";
import ProdutoCard from "@/components/produtos/ProdutoCard";
import RainbowTitle from "@/components/produtos/RainbowTitle";
import { listarCategorias, listarProdutos } from "@/lib/produtos/repository";
import styles from "@/components/produtos/produtos.module.css";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  const { q, categoria } = await searchParams;
  const [produtos, categorias] = await Promise.all([
    listarProdutos({ q, categoria }),
    listarCategorias(),
  ]);

  return (
    <div className="container">
      <div className={styles.hero}>
        <p className={styles.eyebrow}>feito com amor por duas irmãs</p>
        <RainbowTitle texto="Ideias que ganham forma" />
      </div>

      <div className={styles.filters}>
        <div className={styles.cats}>
          <Link href="/produtos" className={!categoria ? styles.catChipActive : styles.catChip}>
            Todas
          </Link>
          {categorias.map((c) => (
            <Link
              key={c}
              href={`/produtos/${c}`}
              className={categoria === c ? styles.catChipActive : styles.catChip}
            >
              {c}
            </Link>
          ))}
        </div>
        <form className={styles.search} action="/produtos">
          <input type="search" name="q" placeholder="buscar produto…" defaultValue={q ?? ""} />
        </form>
      </div>

      <div className={styles.grid}>
        {produtos.length === 0 ? (
          <p className={styles.empty}>
            {q || categoria
              ? "Nenhum produto encontrado para essa busca."
              : "Nenhum produto cadastrado ainda."}
          </p>
        ) : (
          produtos.map((produto) => <ProdutoCard key={produto._id?.toString()} produto={produto} />)
        )}
      </div>
    </div>
  );
}
