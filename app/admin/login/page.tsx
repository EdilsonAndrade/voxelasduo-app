import LoginForm from "@/components/admin/LoginForm";
import styles from "@/components/admin/admin.module.css";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className={styles.loginPagina}>
      <LoginForm callbackUrl={callbackUrl?.startsWith("/admin") ? callbackUrl : "/admin/produtos"} />
    </div>
  );
}
