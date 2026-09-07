import Link from "next/link";
import SairClienteButton from "./SairClienteButton";
import styles from "./cliente.module.css";

export default function MinhaContaNav({ ativo }: { ativo: "dados" | "pedidos" }) {
  return (
    <nav className={styles.contaNav}>
      <Link href="/minha-conta" className={ativo === "dados" ? styles.contaNavAtivo : undefined}>
        Meus dados
      </Link>
      <Link
        href="/minha-conta/pedidos"
        className={ativo === "pedidos" ? styles.contaNavAtivo : undefined}
      >
        Meus pedidos
      </Link>
      <SairClienteButton />
    </nav>
  );
}
