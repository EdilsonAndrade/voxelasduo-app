import type { Metadata } from "next";
import EditorLinkPagamento, { type OpcaoCatalogoLink } from "@/components/admin/linksPagamento/EditorLinkPagamento";
import styles from "@/components/admin/admin.module.css";
import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { listarProdutos } from "@/lib/produtos/repository";
import { nomeComVariacao, temVariacoes } from "@/lib/produtos/variacoes";
import { custosDasVariacoes } from "@/lib/produtos/variacoesRepository";

export const metadata: Metadata = {
  title: "Novo link de pagamento · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

export default async function NovoLinkPagamentoPage() {
  const [produtos, taxas] = await Promise.all([listarProdutos(), buscarTaxasCanais()]);

  const catalogo: OpcaoCatalogoLink[] = [];
  for (const produto of produtos) {
    const produtoId = produto._id!.toString();
    if (temVariacoes(produto)) {
      // Produto com kits (specs/041): cada variação entra como uma opção.
      const custos = new Map((await custosDasVariacoes(produto.variacoes!)).map((c) => [c.variacaoId, c]));
      for (const variacao of produto.variacoes!) {
        const custo = custos.get(variacao.id);
        catalogo.push({
          valor: `${produtoId}:${variacao.id}`,
          produtoId,
          variacaoId: variacao.id,
          nome: nomeComVariacao(produto.nome, variacao.nome),
          precoCentavos: variacao.preco,
          estoque: variacao.estoque,
          custoCentavos: custo && !custo.incompleto ? custo.custoCentavos : null,
        });
      }
      continue;
    }
    const custoTotal = produto.custoProducao ? calcularCustoProducao(produto.custoProducao).totalCentavos : null;
    catalogo.push({
      valor: `${produtoId}:`,
      produtoId,
      nome: produto.nome,
      precoCentavos: produto.preco,
      estoque: produto.estoque,
      custoCentavos: custoTotal !== null && Number.isFinite(custoTotal) ? custoTotal : null,
    });
  }
  catalogo.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="container">
      <div className={styles.bar}>
        <h1>Novo link de pagamento</h1>
      </div>
      <p className={styles.mlLinkAviso}>
        Escolha os produtos, dê o desconto de cada item e gere o link. O cliente paga por Pix ou cartão no site, e o link
        vale para uma compra só.
      </p>
      <EditorLinkPagamento
        catalogo={catalogo}
        taxaSite={{ percentual: taxas.siteTaxaPercentual, fixaCentavos: taxas.siteTaxaFixaCentavos }}
      />
    </div>
  );
}
