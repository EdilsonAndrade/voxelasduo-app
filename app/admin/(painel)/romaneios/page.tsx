import type { Metadata } from "next";
import Link from "next/link";
import ListaRomaneios from "@/components/admin/romaneios/ListaRomaneios";
import styles from "@/components/admin/admin.module.css";
import { listarRomaneios } from "@/lib/romaneios/repository";

export const metadata: Metadata = {
  title: "Romaneios · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

/** Romaneios de consignação (specs/038): o que saiu para cada lugar e o acerto. */
export default async function RomaneiosPage() {
  const romaneios = await listarRomaneios();
  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Romaneios</h1>
        <div className={styles.barAcoes}>
          <Link href="/admin/romaneios/novo" className={styles.btnPrimary}>
            + Novo romaneio
          </Link>
        </div>
      </div>
      <ListaRomaneios romaneios={romaneios} />
    </div>
  );
}
