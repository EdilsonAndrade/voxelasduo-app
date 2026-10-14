import PesquisaNichos from "@/components/admin/PesquisaNichos";
import styles from "@/components/admin/admin.module.css";

export default function NichosPage() {
  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Pesquisa de nichos</h1>
      </div>
      <PesquisaNichos />
    </div>
  );
}
