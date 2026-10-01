import Link from "next/link";
import FiltroCarrossel from "@/components/admin/FiltroCarrossel";
import ListaProdutosAdmin, { type ProdutoLinha } from "@/components/admin/ListaProdutosAdmin";
import { listarCategoriasResumo } from "@/lib/categorias/repository";
import { listarCarrosseis } from "@/lib/home/repository";
import { listarProdutos } from "@/lib/produtos/repository";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
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

  // Dados prontos para a lista client (EDI-126): o custo vem calculado, igual ao da tela de edição.
  const linhas: ProdutoLinha[] = produtos.map((produto) => {
    const id = produto._id!.toString();
    const custo = produto.custoProducao ? calcularCustoProducao(produto.custoProducao).totalCentavos : null;
    return {
      id,
      nome: produto.nome,
      categoria: produto.categoria,
      estoque: produto.estoque,
      precoCentavos: produto.preco,
      precoMercadoLivreCentavos: produto.precosCanais?.mercadoLivre ?? null,
      precoShopeeCentavos: produto.precosCanais?.shopee ?? null,
      custoCentavos: custo !== null && Number.isFinite(custo) ? custo : null,
      mercadoLivrePermalink: produto.integracoes?.mercadoLivrePermalink ?? null,
      noCatalogoFacebook: produto.metaCatalogo?.publicar === true,
      carrosseis: carrosseisPorProduto.get(id) ?? [],
    };
  });

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
        <ListaProdutosAdmin produtos={linhas} categorias={categorias} carrosseis={opcoesCarrossel} />
      )}
    </div>
  );
}
