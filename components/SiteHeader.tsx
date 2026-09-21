import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth/clienteConfig";
import { auth as authAdmin } from "@/lib/auth/config";
import SairButton from "./admin/SairButton";
import SairClienteButton from "./cliente/SairClienteButton";
import ThemeToggle from "./ThemeToggle";
import CarrinhoIcone from "./carrinho/CarrinhoIcone";
import styles from "./SiteHeader.module.css";

/** Estado de login do cliente (Tarefa 10/EDI-84) — lido server-side, sem SessionProvider (research.md #9b). */
export default async function SiteHeader() {
  const session = await auth();
  const sessionAdmin = await authAdmin();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand}>
          <Image src="/images/logo.png" alt="Voxelas Duo" width={68} height={68} className={styles.logo} priority />
        </Link>
        <nav className={styles.nav}>
          <Link href="/produtos">Produtos</Link>
          <Link href="/encomendas">Encomendas</Link>
          {session?.user ? (
            <>
              <Link href="/minha-conta">Minha conta</Link>
              <SairClienteButton className={styles.navBotao} />
            </>
          ) : (
            <Link href="/entrar">Entrar</Link>
          )}
          {/* Sem sessão de admin, o proxy leva ao login e volta para o painel depois de entrar. */}
          <Link href="/admin/produtos">Admin</Link>
          {sessionAdmin?.user && <SairButton className={styles.navBotao} rotulo="Sair do admin" />}
        </nav>
        <div className={styles.actions}>
          <CarrinhoIcone />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
