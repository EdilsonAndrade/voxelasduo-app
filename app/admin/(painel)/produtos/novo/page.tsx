import ProdutoForm from "@/components/admin/ProdutoForm";
import styles from "@/components/admin/admin.module.css";

export default function NovoProdutoPage() {
  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Novo produto</h1>
      </div>
      <ProdutoForm />
    </div>
  );
}
