import Link from "next/link";
import styles from "./financeiro.module.css";

const ABAS = [
  { chave: "painel", href: "/admin/financeiro", rotulo: "Painel" },
  { chave: "vendas", href: "/admin/financeiro/vendas", rotulo: "Vendas lançadas" },
  { chave: "despesas", href: "/admin/financeiro/despesas", rotulo: "Despesas" },
  { chave: "insumos", href: "/admin/financeiro/insumos", rotulo: "Insumos" },
  { chave: "impressoras", href: "/admin/financeiro/impressoras", rotulo: "Impressoras" },
] as const;

export default function AbasFinanceiro({ ativa }: { ativa: (typeof ABAS)[number]["chave"] }) {
  return (
    <nav className={styles.abas} aria-label="Financeiro">
      {ABAS.map((aba) => (
        <Link
          key={aba.chave}
          href={aba.href}
          className={`${styles.aba} ${aba.chave === ativa ? styles.abaAtiva : ""}`}
          aria-current={aba.chave === ativa ? "page" : undefined}
        >
          {aba.rotulo}
        </Link>
      ))}
    </nav>
  );
}
