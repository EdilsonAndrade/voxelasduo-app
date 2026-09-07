import FormularioRedefinirSenha from "@/components/cliente/FormularioRedefinirSenha";
import styles from "@/components/cliente/cliente.module.css";

export const metadata = { title: "Redefinir senha — Voxelas Duo" };

export default function RedefinirSenhaPage() {
  return (
    <div className={styles.pagina}>
      <div className={styles.cartao}>
        <p className={styles.eyebrow}>quase lá</p>
        <h1 className={styles.titulo}>Redefinir senha</h1>
        <FormularioRedefinirSenha />
      </div>
    </div>
  );
}
