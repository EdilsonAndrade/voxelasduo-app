import Link from "next/link";
import type { Produto } from "@/lib/models/produto";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./produtos.module.css";

export default function ProdutoCard({ produto }: { produto: Produto }) {
  const semEstoque = produto.estoque === 0;

  return (
    <Link href={`/produtos/${produto.categoria}/${produto.slug}`} className={styles.card}>
      <div className={styles.cardPhoto}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={produto.fotos[0]} alt={produto.nome} />
        <div className={`${styles.stockFlag} ${semEstoque ? styles.stockFlagOut : ""}`}>
          <span className={styles.stockDot} />
          {semEstoque ? "esgotado" : "em estoque"}
        </div>
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{produto.nome}</h3>
        <div className={styles.cardPrice}>{formatarPreco(produto.preco)}</div>
        <div className={styles.specLabel}>
          <span>categoria</span>
          <span className={styles.v}>{produto.categoria}</span>
          <span>estoque</span>
          <span className={styles.v}>{produto.estoque} un.</span>
        </div>
      </div>
    </Link>
  );
}
