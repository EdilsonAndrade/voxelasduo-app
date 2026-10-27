import type { Metadata } from "next";
import Link from "next/link";
import ListaKits from "@/components/admin/kits/ListaKits";
import styles from "@/components/admin/admin.module.css";
import { listarKits } from "@/lib/kits/repository";

export const metadata: Metadata = {
  title: "Kits · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

/** Montador de kits (specs/037): lista dos kits montados. */
export default async function KitsPage() {
  const kits = await listarKits();
  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Kits</h1>
        <div className={styles.barAcoes}>
          <Link href="/admin/kits/novo" className={styles.btnPrimary}>
            + Novo kit
          </Link>
        </div>
      </div>
      <ListaKits kits={kits} />
    </div>
  );
}
