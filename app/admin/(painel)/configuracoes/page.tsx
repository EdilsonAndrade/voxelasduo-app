import MargensParaRevisar, { type MargemParaRevisar } from "@/components/admin/MargensParaRevisar";
import TaxasCanaisForm from "@/components/admin/TaxasCanaisForm";
import styles from "@/components/admin/admin.module.css";
import { sugerirMargemPreco } from "@/lib/configuracoes/migracaoMargens";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { resolverTaxasCanais } from "@/lib/produtos/canais";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { listarMargensParaRevisar } from "@/lib/produtos/repository";

// Lê sempre o valor salvo — sem isso a página seria pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function ConfiguracoesTaxasPage() {
  // As taxas primeiro: a leitura delas é que migra as margens antigas para a revisão.
  const taxas = await buscarTaxasCanais();
  const produtos = await listarMargensParaRevisar();

  const margens: MargemParaRevisar[] = produtos.map((produto) => {
    const antigas = produto.margensParaRevisar!;
    const custo = produto.custoProducao ? calcularCustoProducao(produto.custoProducao).totalCentavos : 0;
    const shopee = resolverTaxasCanais(taxas, produto.taxasCanais).shopee;
    const sugestao = (markup?: number) => (markup === undefined ? null : sugerirMargemPreco(custo, markup, shopee));
    return {
      id: String(produto._id),
      nome: produto.nome,
      minimaSobreCusto: antigas.minimaSobreCusto,
      desejadaSobreCusto: antigas.desejadaSobreCusto,
      sugestaoMinimaPreco: sugestao(antigas.minimaSobreCusto),
      sugestaoDesejadaPreco: sugestao(antigas.desejadaSobreCusto),
    };
  });

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Taxas dos canais de venda</h1>
      </div>
      <TaxasCanaisForm valoresIniciais={taxas} />
      <MargensParaRevisar itens={margens} />
    </div>
  );
}
