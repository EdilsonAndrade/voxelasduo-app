import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { calculosParaLink } from "@/lib/linksPagamento/calculos";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import type { Produto } from "@/lib/models/produto";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { listarProdutos } from "@/lib/produtos/repository";
import { nomeComVariacao, temVariacoes } from "@/lib/produtos/variacoes";
import { buscarPecas, custosDasVariacoes } from "@/lib/produtos/variacoesRepository";

/** Produto, kit ou cálculo (ainda sem produto) que pode entrar numa venda lançada à mão. */
export interface OpcaoVenda {
  /** `produto:${produtoId}:${variacaoId ?? ""}` ou `calculo:${calculoId}` */
  valor: string;
  origem: "produto" | "calculo";
  produtoId?: string;
  variacaoId?: string;
  calculoId?: string;
  nome: string;
  precoCentavos: number;
  /** `null` = sem custo cadastrado. */
  custoCentavos: number | null;
  depreciacaoCentavos: number;
}

/** Chave do custo de um item de pedido. */
export const chaveProduto = (produtoId: string, variacaoId?: string) => `produto:${produtoId}:${variacaoId ?? ""}`;

function custoDoProduto(produto: Pick<Produto, "custoProducao">): { total: number | null; depreciacao: number } {
  if (!produto.custoProducao) return { total: null, depreciacao: 0 };
  const cogs = calcularCustoProducao(produto.custoProducao);
  return Number.isFinite(cogs.totalCentavos)
    ? { total: cogs.totalCentavos, depreciacao: Number.isFinite(cogs.custoDepreciacaoCentavos) ? cogs.custoDepreciacaoCentavos : 0 }
    : { total: null, depreciacao: 0 };
}

export interface CatalogoVenda {
  opcoes: OpcaoVenda[];
  taxas: TaxasCanaisConfig;
}

/** Produtos (com ou sem estoque), kits e cálculos sem produto, com custo e desgaste de hoje. */
export async function montarCatalogoVenda(): Promise<CatalogoVenda> {
  const [produtos, taxas] = await Promise.all([listarProdutos(), buscarTaxasCanais()]);
  const taxaSite = { percentual: taxas.siteTaxaPercentual, fixaCentavos: taxas.siteTaxaFixaCentavos };
  const pecas = await buscarPecas(produtos.flatMap((p) => (p.variacoes ?? []).flatMap((v) => v.pecas.map((x) => x.produtoId))));

  const opcoes: OpcaoVenda[] = [];
  for (const produto of produtos) {
    const produtoId = produto._id!.toString();
    if (temVariacoes(produto)) {
      const custos = new Map((await custosDasVariacoes(produto.variacoes!)).map((c) => [c.variacaoId, c]));
      for (const variacao of produto.variacoes!) {
        const custo = custos.get(variacao.id);
        const depreciacao = variacao.pecas.reduce((soma, peca) => {
          const doc = pecas.get(peca.produtoId);
          return soma + (doc ? custoDoProduto(doc).depreciacao * peca.quantidade : 0);
        }, 0);
        opcoes.push({
          valor: chaveProduto(produtoId, variacao.id),
          origem: "produto",
          produtoId,
          variacaoId: variacao.id,
          nome: nomeComVariacao(produto.nome, variacao.nome),
          precoCentavos: variacao.preco,
          custoCentavos: custo && !custo.incompleto ? custo.custoCentavos : null,
          depreciacaoCentavos: Math.round(depreciacao),
        });
      }
      continue;
    }
    const custo = custoDoProduto(produto);
    opcoes.push({
      valor: chaveProduto(produtoId),
      origem: "produto",
      produtoId,
      nome: produto.nome,
      precoCentavos: produto.preco,
      custoCentavos: custo.total,
      depreciacaoCentavos: custo.depreciacao,
    });
  }

  for (const calculo of await calculosParaLink(taxaSite)) {
    opcoes.push({
      valor: `calculo:${calculo.calculoId}`,
      origem: "calculo",
      calculoId: calculo.calculoId,
      nome: calculo.nome,
      precoCentavos: calculo.precoCentavos,
      custoCentavos: calculo.custoCentavos,
      depreciacaoCentavos: calculo.depreciacaoCentavos,
    });
  }
  opcoes.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return { opcoes, taxas };
}
