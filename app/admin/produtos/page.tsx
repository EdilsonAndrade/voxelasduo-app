import Link from "next/link";
import { listarProdutos } from "@/lib/produtos/repository";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "@/components/admin/admin.module.css";

// Sempre busca dados atuais — sem isso o Next.js pré-renderiza esta página
// estaticamente no build (nenhum searchParams/params força dynamic aqui),
// congelando a listagem e escondendo criações/edições/remoções em produção.
export const dynamic = "force-dynamic";

export default async function AdminProdutosPage() {
  const produtos = await listarProdutos();

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Produtos cadastrados</h1>
        <Link href="/admin/produtos/novo" className={styles.btnPrimary}>
          + Novo produto
        </Link>
      </div>

      {produtos.length === 0 ? (
        <p className={styles.empty}>Nenhum produto cadastrado ainda.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Estoque</th>
              <th>Preço</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((produto) => (
              <tr key={produto._id?.toString()}>
                <td>{produto.nome}</td>
                <td>{produto.categoria}</td>
                <td>
                  <span className={produto.estoque === 0 ? styles.badgeZero : styles.badge}>
                    {produto.estoque} un.
                  </span>
                </td>
                <td>{formatarPreco(produto.preco)}</td>
                <td>
                  <Link href={`/admin/produtos/${produto._id?.toString()}/editar`} className={styles.btnGhost}>
                    editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
