import FormularioLogin from "@/components/cliente/FormularioLogin";
import styles from "@/components/cliente/cliente.module.css";

export const metadata = { title: "Entrar — Voxelas Duo" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  // Evita open-redirect — só aceita caminhos internos (mesmo padrão de app/admin/login/page.tsx).
  const callbackSeguro = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : undefined;

  return (
    <div className={styles.pagina}>
      <div className={styles.cartao}>
        <p className={styles.eyebrow}>bem-vindo de volta</p>
        <h1 className={styles.titulo}>Entrar</h1>
        <FormularioLogin callbackUrl={callbackSeguro} />
      </div>
    </div>
  );
}
