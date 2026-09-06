import { auth } from "@/lib/auth/config";
import SairButton from "@/components/admin/SairButton";
import styles from "@/components/admin/admin.module.css";

export default async function AdminPainelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <>
      <div className={styles.topoAdmin}>
        <div className={`container ${styles.topoAdminConteudo}`}>
          <span className={styles.topoAdminMarca}>Voxelas Duo · painel</span>
          <div className={styles.topoAdminUsuario}>
            {session?.user?.name && <span>{session.user.name}</span>}
            <SairButton />
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
