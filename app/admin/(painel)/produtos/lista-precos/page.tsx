import Link from "next/link";
import { ObjectId } from "mongodb";
import ImprimirButton from "@/components/admin/ImprimirButton";
import { listarProdutosPorIds } from "@/lib/produtos/repository";
import { formatarPreco } from "@/lib/produtos/formato";
import { letraIndice, ordenarPorNome } from "@/lib/produtos/precoLista";
import adminStyles from "@/components/admin/admin.module.css";
import styles from "./listaPrecos.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lista de preços · Voxelas Duo" };

/**
 * Lista de preços para levar ao evento (EDI-126): só os produtos marcados na
 * lista do admin, em ordem alfabética, agrupados pela inicial. O PDF vem do
 * "Salvar como PDF" da impressão do navegador.
 */
export default async function ListaPrecosPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids = "" } = await searchParams;
  const objectIds = ids
    .split(",")
    .map((id) => id.trim())
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const produtos = ordenarPorNome(await listarProdutosPorIds(objectIds));

  const grupos: { letra: string; itens: typeof produtos }[] = [];
  for (const produto of produtos) {
    const letra = letraIndice(produto.nome);
    const ultimo = grupos.at(-1);
    if (ultimo?.letra === letra) ultimo.itens.push(produto);
    else grupos.push({ letra, itens: [produto] });
  }

  const geradoEm = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <div className={`container ${styles.pagina}`}>
      <div className={`${styles.acoes} nao-imprimir`}>
        <Link href="/admin/produtos" className={adminStyles.btnGhost}>
          ← Voltar aos produtos
        </Link>
        {produtos.length > 0 && <ImprimirButton className={adminStyles.btnPrimary} />}
      </div>

      {produtos.length === 0 ? (
        <p className={adminStyles.empty}>
          Nenhum produto selecionado. Volte à lista de produtos e marque os que vão para o evento.
        </p>
      ) : (
        <article className={styles.folha}>
          <header className={styles.cabecalho}>
            <h1 className={styles.titulo}>Tabela de preços</h1>
            <p className={styles.subtitulo}>
              Voxelas Duo · {produtos.length} {produtos.length === 1 ? "produto" : "produtos"} · {geradoEm}
            </p>
          </header>

          <div className={styles.colunas}>
            {grupos.map((grupo) => (
              <section key={grupo.letra} className={styles.grupo} aria-label={`Produtos com ${grupo.letra}`}>
                <h2 className={styles.letra}>{grupo.letra}</h2>
                <ul className={styles.itens}>
                  {grupo.itens.map((produto) => (
                    <li key={produto._id!.toString()} className={styles.item}>
                      <span className={styles.nome}>{produto.nome}</span>
                      <span className={styles.pontilhado} aria-hidden="true" />
                      <span className={styles.preco}>{formatarPreco(produto.preco)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}
