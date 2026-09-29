import Link from "next/link";
import PaginaErro, { estilosPaginaErro as styles } from "@/components/erro/PaginaErro";

/** Página não encontrada (EDI-113) — responde com status 404. */
export default function NotFound() {
  return (
    <PaginaErro
      variante="vazio"
      nota="nada impresso aqui"
      titulo="Página não encontrada"
      texto="O endereço pode ter mudado ou o produto não está mais à venda."
      acoes={
        <>
          <Link href="/produtos" className={styles.botaoPrincipal}>
            Ver produtos
          </Link>
          <Link href="/" className={styles.botaoSecundario}>
            Página inicial
          </Link>
        </>
      }
    />
  );
}
