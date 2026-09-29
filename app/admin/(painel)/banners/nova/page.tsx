import SecaoHomeForm from "@/components/admin/SecaoHomeForm";
import styles from "@/components/admin/admin.module.css";

export default function NovaSecaoHomePage() {
  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Nova seção da home</h1>
      </div>
      <SecaoHomeForm />
    </div>
  );
}
