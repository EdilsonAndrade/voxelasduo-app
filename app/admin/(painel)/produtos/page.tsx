import Link from "next/link";
import FiltroCarrossel from "@/components/admin/FiltroCarrossel";
import MarcarCarrosselProduto from "@/components/admin/MarcarCarrosselProduto";
import TrocarCategoriaProduto from "@/components/admin/TrocarCategoriaProduto";
import { listarCategoriasResumo } from "@/lib/categorias/repository";
import { listarCarrosseis } from "@/lib/home/repository";
import { listarProdutos } from "@/lib/produtos/repository";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "@/components/admin/admin.module.css";

// Sempre busca dados atuais — sem isso o Next.js pré-renderiza esta página
// estaticamente no build (nenhum searchParams/params força dynamic aqui),
// congelando a listagem e escondendo criações/edições/remoções em produção.
export const dynamic = "force-dynamic";

export default async function AdminProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ carrossel?: string }>;
}) {
  const { carrossel: carrosselFiltro } = await searchParams;
  const [todosProdutos, carrosseis, categorias] = await Promise.all([
    listarProdutos(),
    listarCarrosseis(),
    listarCategoriasResumo(),
  ]);

  // Carrosséis de cada produto (coluna "Destaques", EDI-114).
  const carrosseisPorProduto = new Map<string, string[]>();
  for (const carrossel of carrosseis) {
    for (const pid of carrossel.produtoIds) {
      const chave = pid.toString();
      carrosseisPorProduto.set(chave, [...(carrosseisPorProduto.get(chave) ?? []), carrossel._id!.toString()]);
    }
  }
  const opcoesCarrossel = carrosseis.map((c) => ({ id: c._id!.toString(), titulo: c.titulo }));

  // Filtro ?carrossel=<id>: só os marcados, na ordem do carrossel.
  const carrosselSelecionado = carrosseis.find((c) => c._id!.toString() === carrosselFiltro);
  const produtos = carrosselSelecionado
    ? carrosselSelecionado.produtoIds
        .map((pid) => todosProdutos.find((p) => p._id?.toString() === pid.toString()))
        .filter((p) => p !== undefined)
    : todosProdutos;

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Produtos cadastrados</h1>
        <Link href="/admin/produtos/novo" className={styles.btnPrimary}>
          + Novo produto
        </Link>
      </div>

      <FiltroCarrossel carrosseis={opcoesCarrossel} atual={carrosselSelecionado ? carrosselFiltro : undefined} />

      {produtos.length === 0 ? (
        <p className={styles.empty}>
          {carrosselSelecionado
            ? "Nenhum produto marcado neste carrossel. Use a coluna Destaques para marcar."
            : "Nenhum produto cadastrado ainda."}
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Estoque</th>
              <th>Preço</th>
              <th>Canais</th>
              <th>Destaques</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((produto) => (
              <tr key={produto._id?.toString()}>
                <td>{produto.nome}</td>
                <td>
                  <TrocarCategoriaProduto
                    produtoId={produto._id!.toString()}
                    produtoNome={produto.nome}
                    categoriaInicial={produto.categoria}
                    categorias={categorias}
                  />
                </td>
                <td>
                  <span className={produto.estoque === 0 ? styles.badgeZero : styles.badge}>
                    {produto.estoque} un.
                  </span>
                </td>
                <td>{formatarPreco(produto.preco)}</td>
                <td>
                  {produto.integracoes?.mercadoLivrePermalink ? (
                    <a
                      href={produto.integracoes.mercadoLivrePermalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.badgeCanalMercadoLivre}
                      title="Abrir anúncio no Mercado Livre"
                    >
                      Mercado Livre ↗
                    </a>
                  ) : (
                    <span className={styles.badgeCanalShopeeEmBreve} title="Sem anúncio no Mercado Livre">
                      Mercado Livre
                    </span>
                  )}{" "}
                  {/* Sem link: a loja da Shopee ainda depende de vendas manuais para ser liberada. */}
                  <span className={styles.badgeCanalShopeeEmBreve} title="Loja da Shopee ainda sem link">
                    Shopee
                  </span>{" "}
                  {produto.metaCatalogo?.publicar ? (
                    <span className={styles.badgeCanalFacebook} title="No catálogo do Facebook/Instagram">
                      Facebook
                    </span>
                  ) : (
                    <span className={styles.badgeCanalShopeeEmBreve} title="Fora do catálogo do Facebook/Instagram">
                      Facebook
                    </span>
                  )}
                </td>
                <td>
                  <MarcarCarrosselProduto
                    produtoId={produto._id!.toString()}
                    produtoNome={produto.nome}
                    carrosseis={opcoesCarrossel}
                    marcadosIniciais={carrosseisPorProduto.get(produto._id!.toString()) ?? []}
                  />
                </td>
                <td>
                  <Link href={`/admin/produtos/${produto._id?.toString()}/editar`} className={styles.btnGhost}>
                    editar
                  </Link>{" "}
                  <Link
                    href={`/admin/produtos/novo?duplicarDe=${produto._id?.toString()}`}
                    className={styles.btnGhost}
                    title="Cria um novo produto com os mesmos dados e preços (sem fotos, estoque e anúncios)"
                  >
                    duplicar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
