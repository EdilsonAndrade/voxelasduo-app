import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import CarrinhoIcone from "./carrinho/CarrinhoIcone";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand}>
          <Image src="/images/logo.jpeg" alt="Voxelas Duo" width={110} height={110} className={styles.logo} priority />
        </Link>
        <nav className={styles.nav}>
          <Link href="/produtos">Produtos</Link>
        </nav>
        <CarrinhoIcone />
        <ThemeToggle />
      </div>
    </header>
  );
}
