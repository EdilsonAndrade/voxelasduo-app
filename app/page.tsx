import Link from "next/link";
import RainbowTitle from "@/components/produtos/RainbowTitle";
import styles from "@/components/produtos/produtos.module.css";
import adminStyles from "@/components/admin/admin.module.css";

export default function Home() {
  return (
    <main className="container">
      <div className={styles.hero}>
        <p className={styles.eyebrow}>duas irmãs, muitas ideias</p>
        <RainbowTitle texto="Voxelas Duo" />
      </div>
      <p className={styles.detailDesc}>
        Peças impressas em 3D cheias de personalidade — decoração, organização e itens
        personalizados, do jeito da sua casa.
      </p>
      <Link href="/produtos" className={adminStyles.btnPrimary}>
        Ver produtos
      </Link>
    </main>
  );
}
