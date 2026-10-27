import Link from "next/link";
import styles from "@/components/admin/admin.module.css";
import type { KitResumo } from "@/lib/kits/repository";
import { formatarPreco } from "@/lib/produtos/formato";
import k from "./kits.module.css";

/** Lista de kits (specs/037): soma avulsa, preço escolhido e o selo de preço desatualizado. */
export default function ListaKits({ kits }: { kits: KitResumo[] }) {
  if (kits.length === 0) {
    return (
      <div className={`${k.card} ${k.listaVazia}`}>
        <p>Nenhum kit ainda. Monte o primeiro juntando produtos do catálogo e peças novas.</p>
        <Link href="/admin/kits/novo" className={styles.btnPrimary}>
          + Novo kit
        </Link>
      </div>
    );
  }

  return (
    <div className={`${k.card} ${k.tabelaWrap}`}>
      <table className={k.tabela}>
        <thead>
          <tr>
            <th>Kit</th>
            <th className={k.num}>Itens</th>
            <th className={k.num}>Soma avulsa</th>
            <th className={k.num}>Preço do kit</th>
            <th>Produto</th>
          </tr>
        </thead>
        <tbody>
          {kits.map((kit) => (
            <tr key={kit.id}>
              <td>
                <Link href={`/admin/kits/${kit.id}`}>{kit.nome}</Link>
                {kit.desatualizado && <span className={k.seloAlerta}>preço desatualizado</span>}
              </td>
              <td className={k.num}>{kit.itens}</td>
              <td className={k.num}>{formatarPreco(kit.somaAvulsaCentavos)}</td>
              <td className={k.num}>{kit.precoCentavos === null ? <span className={k.faltando}>sem preço</span> : formatarPreco(kit.precoCentavos)}</td>
              <td>
                {kit.produtoId ? (
                  <Link href={`/admin/produtos/${kit.produtoId}/editar`}>Abrir produto</Link>
                ) : (
                  <span className={k.faltando}>ainda não virou produto</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
