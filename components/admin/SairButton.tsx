"use client";

import { signOut } from "next-auth/react";
import styles from "./admin.module.css";

export default function SairButton({ className, rotulo = "Sair" }: { className?: string; rotulo?: string }) {
  return (
    <button
      type="button"
      className={className ?? styles.btnGhost}
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      {rotulo}
    </button>
  );
}
