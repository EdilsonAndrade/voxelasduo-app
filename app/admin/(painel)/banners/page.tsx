import Link from "next/link";
import SecoesHomeLista, { type SecaoResumo } from "@/components/admin/SecoesHomeLista";
import { listarSecoes } from "@/lib/home/repository";
import { ehBanner } from "@/lib/models/secaoHome";
import styles from "@/components/admin/admin.module.css";

// Sempre busca dados atuais (mesmo motivo de /admin/produtos).
export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const secoes = await listarSecoes();

  const resumos: SecaoResumo[] = secoes.map((secao) => ({
    id: secao._id!.toString(),
    tipo: secao.tipo,
    titulo: secao.titulo,
    ativa: secao.ativa,
    miniatura: ehBanner(secao) ? (secao.imagemMobile ?? secao.imagemDesktop) : undefined,
    quantidadeProdutos: secao.tipo === "carrossel" ? secao.produtoIds.length : undefined,
  }));

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Banners da home</h1>
        <Link href="/admin/banners/nova" className={styles.btnPrimary}>
          + Nova seção
        </Link>
      </div>
      <p>
        Monte a página inicial com banners, carrosséis de produtos e textos de destaque. A home mostra as seções na ordem
        abaixo; use ↑ ↓ para reorganizar.
      </p>
      <SecoesHomeLista secoesIniciais={resumos} />
    </div>
  );
}
