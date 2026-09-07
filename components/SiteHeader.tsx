import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth/clienteConfig";
import SairClienteButton from "./cliente/SairClienteButton";
import ThemeToggle from "./ThemeToggle";
import CarrinhoIcone from "./carrinho/CarrinhoIcone";
import styles from "./SiteHeader.module.css";

/** Estado de login do cliente (Tarefa 10/EDI-84) — lido server-side, sem SessionProvider (research.md #9b). */
export default async function SiteHeader() {
  const session = await auth();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand}>
          <Image src="/images/logo.png" alt="Voxelas Duo" width={68} height={68} className={styles.logo} priority />
        </Link>
        <nav className={styles.nav}>
          <Link href="/produtos">Produtos</Link>
          {session?.user ? (
            <>
              <Link href="/minha-conta">Minha conta</Link>
              <SairClienteButton className={styles.navBotao} />
            </>
          ) : (
            <Link href="/entrar">Entrar</Link>
          )}
        </nav>
        <div className={styles.actions}>
          <CarrinhoIcone />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
