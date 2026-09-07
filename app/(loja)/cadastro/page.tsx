import FormularioCadastro from "@/components/cliente/FormularioCadastro";
import styles from "@/components/cliente/cliente.module.css";

export const metadata = { title: "Criar conta — Voxelas Duo" };

export default function CadastroPage() {
  return (
    <div className={styles.pagina}>
      <div className={styles.cartao}>
        <p className={styles.eyebrow}>bem-vindo</p>
        <h1 className={styles.titulo}>Criar conta</h1>
        <FormularioCadastro />
      </div>
    </div>
  );
}
