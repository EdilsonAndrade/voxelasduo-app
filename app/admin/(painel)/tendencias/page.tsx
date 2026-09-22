import TendenciasBusca from "@/components/admin/TendenciasBusca";
import styles from "@/components/admin/admin.module.css";

export default function TendenciasPage() {
  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Descoberta de tendências (Mercado Livre)</h1>
      </div>
      <TendenciasBusca />
    </div>
  );
}
