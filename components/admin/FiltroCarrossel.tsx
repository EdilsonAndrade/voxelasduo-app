"use client";

import { usePathname, useRouter } from "next/navigation";
import type { CarrosselOpcao } from "./MenuAcoesProduto";
import styles from "./admin.module.css";

/** Filtra a lista de produtos pelos marcados em um carrossel (FR-010) — `?carrossel=<id>`. */
export default function FiltroCarrossel({
  carrosseis,
  atual,
}: {
  carrosseis: CarrosselOpcao[];
  atual?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (carrosseis.length === 0) return null;

  return (
    <div className={styles.filtros}>
      <select
        className={styles.filtroSelect}
        aria-label="Filtrar por carrossel da home"
        value={atual ?? ""}
        onChange={(evento) => {
          const valor = evento.target.value;
          router.push(valor ? `${pathname}?carrossel=${valor}` : pathname);
        }}
      >
        <option value="">Todos os produtos</option>
        {carrosseis.map((c) => (
          <option key={c.id} value={c.id}>
            Carrossel: {c.titulo}
          </option>
        ))}
      </select>
    </div>
  );
}
