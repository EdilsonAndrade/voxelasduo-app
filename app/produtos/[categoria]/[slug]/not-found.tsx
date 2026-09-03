import Link from "next/link";
import styles from "@/components/produtos/produtos.module.css";

export default function ProdutoNaoEncontrado() {
  return (
    <div className="container">
      <div className={styles.notFound}>
        <h1>Produto não encontrado</h1>
        <p>Esse produto não existe ou foi removido do catálogo.</p>
        <Link href="/produtos">Voltar para produtos</Link>
      </div>
    </div>
  );
}
