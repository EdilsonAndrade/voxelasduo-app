import FormularioVerificarEmail from "@/components/cliente/FormularioVerificarEmail";
import styles from "@/components/cliente/cliente.module.css";

export const metadata = { title: "Confirme seu e-mail — Voxelas Duo" };

export default async function VerificarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className={styles.pagina}>
      <div className={styles.cartao}>
        <p className={styles.eyebrow}>falta pouco</p>
        <h1 className={styles.titulo}>Confirme seu e-mail</h1>
        <p className={styles.subtitulo}>
          Enviamos um código de 6 dígitos para o seu e-mail. Ele vale por 10 minutos.
        </p>
        <FormularioVerificarEmail emailInicial={email} />
      </div>
    </div>
  );
}
