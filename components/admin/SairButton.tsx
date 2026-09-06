"use client";

import { signOut } from "next-auth/react";
import styles from "./admin.module.css";

export default function SairButton() {
  return (
    <button
      type="button"
      className={styles.btnGhost}
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      Sair
    </button>
  );
}
