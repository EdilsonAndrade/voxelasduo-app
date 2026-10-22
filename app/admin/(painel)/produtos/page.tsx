import Link from "next/link";
import FiltroCarrossel from "@/components/admin/FiltroCarrossel";
import ListaProdutosAdmin, { type ProdutoLinha } from "@/components/admin/ListaProdutosAdmin";
import { listarCategoriasResumo } from "@/lib/categorias/repository";
import { listarCarrosseis } from "@/lib/home/repository";
import { listarProdutos } from "@/lib/produtos/repository";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { listarCalculosPreco } from "@/lib/produtos/calculosPreco";
import { comissaoCanal, resolverTaxasCanais } from "@/lib/produtos/canais";
import { calcularVerbaDesconto } from "@/lib/produtos/verbaDesconto";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
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
  // As taxas antes dos produtos: a primeira leitura delas migra as margens antigas (spec 034).
  const taxas = await buscarTaxasCanais();
  const [todosProdutos, carrosseis, categorias, calculos] = await Promise.all([
    listarProdutos(),
    listarCarrosseis(),
    listarCategoriasResumo(),
    listarCalculosPreco(),
  ]);
  const produtosComCalculo = new Set(calculos.flatMap((c) => (c.produtoId ? [c.produtoId] : [])));

  // Carrosséis de cada produto (menu ☰ da linha, EDI-114).
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
    const custoValido = custo !== null && Number.isFinite(custo) ? custo : null;
    // Verba de desconto no preço da Shopee salvo (o do site quando a Shopee não tem preço próprio).
    const shopee = resolverTaxasCanais(taxas, produto.taxasCanais).shopee;
    const verbaShopee =
      custoValido !== null
        ? calcularVerbaDesconto({
            precoCentavos: produto.precosCanais?.shopee ?? produto.preco,
            pisoPercentual: produto.taxasCanais?.margemMinimaPercentual ?? taxas.margemMinimaPercentual,
            cupomLoja: { percentual: taxas.cupomLojaPercentual, tetoCentavos: taxas.cupomLojaTetoCentavos },
            lucroEm: (preco) => preco - comissaoCanal(shopee, preco) - custoValido,
          }).estado
        : null;
    return {
      id,
      nome: produto.nome,
      fotos: produto.fotos ?? [],
      categoria: produto.categoria,
      estoque: produto.estoque,
      precoCentavos: produto.preco,
      precoMercadoLivreCentavos: produto.precosCanais?.mercadoLivre ?? null,
      precoShopeeCentavos: produto.precosCanais?.shopee ?? null,
      custoCentavos: custoValido,
      verbaShopee,
      ajusteEvento: produto.ajusteEvento
        ? { percentual: produto.ajusteEvento.percentual, precoAnterior: produto.ajusteEvento.precoAnterior }
        : null,
      mercadoLivrePermalink: produto.integracoes?.mercadoLivrePermalink ?? null,
      noCatalogoFacebook: produto.metaCatalogo?.publicar === true,
      publicado: produto.publicado !== false,
      carrosseis: carrosseisPorProduto.get(id) ?? [],
      temCalculo: produtosComCalculo.has(id),
    };
  });

  return (
    <div className={styles.paginaLarga}>
      <div className={styles.bar}>
        <h1>Produtos cadastrados</h1>
        <div className={styles.barAcoes}>
          <Link href="/admin/produtos/calculadora" className={styles.btnGhost}>
            Calculadora de preço
          </Link>
          <Link href="/admin/produtos/novo" className={styles.btnPrimary}>
            + Novo produto
          </Link>
        </div>
      </div>

      <FiltroCarrossel carrosseis={opcoesCarrossel} atual={carrosselSelecionado ? carrosselFiltro : undefined} />

      {produtos.length === 0 ? (
        <p className={styles.empty}>
          {carrosselSelecionado
            ? "Nenhum produto marcado neste carrossel. Use o menu ☰ de cada produto para marcar."
            : "Nenhum produto cadastrado ainda."}
        </p>
      ) : (
        <ListaProdutosAdmin produtos={linhas} categorias={categorias} carrosseis={opcoesCarrossel} />
      )}
    </div>
  );
}
