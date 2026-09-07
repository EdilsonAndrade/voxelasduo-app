import FormularioRecuperarSenha from "@/components/cliente/FormularioRecuperarSenha";
import styles from "@/components/cliente/cliente.module.css";

export const metadata = { title: "Recuperar senha — Voxelas Duo" };

export default function RecuperarSenhaPage() {
  return (
    <div className={styles.pagina}>
      <div className={styles.cartao}>
        <p className={styles.eyebrow}>esqueceu a senha?</p>
        <h1 className={styles.titulo}>Recuperar senha</h1>
        <FormularioRecuperarSenha />
      </div>
    </div>
  );
}
