import { buscarTaxasCanais } from "@/lib/configuracoes/repository";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { listarProdutos } from "@/lib/produtos/repository";
import { nomeComVariacao, temVariacoes } from "@/lib/produtos/variacoes";
import { custosDasVariacoes } from "@/lib/produtos/variacoesRepository";
import { calculosParaLink } from "./calculos";
import type { LinkPagamentoResumo } from "./apresentacao";

/** Produto (ou variação de kit, ou cálculo que ainda não virou produto) que pode entrar no link. */
export interface OpcaoCatalogoLink {
  /** `${produtoId}:${variacaoId ?? ""}` ou `calculo:${calculoId}` */
  valor: string;
  /** Vazio quando o item vem só da calculadora. */
  produtoId: string;
  variacaoId?: string;
  /** Cálculo de preço sem produto — vira produto rascunho quando o link é gerado. */
  calculoId?: string;
  nome: string;
  precoCentavos: number;
  estoque: number;
  /** Custo de produção da unidade — `null` = sem custo cadastrado. */
  custoCentavos: number | null;
}

/** Valores iniciais do editor ao editar ou duplicar um link. */
export interface LinkInicialEditor {
  itens: { valor: string; quantidade: number; precoCentavos: number }[];
  clienteNome: string;
  observacao: string;
  freteGratis: boolean;
  validadeDias: number;
}

export type TaxaSiteLink = { percentual: number; fixaCentavos: number };

/** Catálogo do editor de link (produtos, kits e cálculos sem produto) e a taxa do site. */
export async function montarCatalogoLink(): Promise<{ catalogo: OpcaoCatalogoLink[]; taxaSite: TaxaSiteLink }> {
  const [produtos, taxas] = await Promise.all([listarProdutos(), buscarTaxasCanais()]);
  const taxaSite = { percentual: taxas.siteTaxaPercentual, fixaCentavos: taxas.siteTaxaFixaCentavos };

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
  // Cálculos que ainda não viraram produto: viram rascunho quando o link é gerado.
  for (const calculo of await calculosParaLink(taxaSite)) {
    catalogo.push({
      valor: `calculo:${calculo.calculoId}`,
      produtoId: "",
      calculoId: calculo.calculoId,
      nome: calculo.nome,
      precoCentavos: calculo.precoCentavos,
      estoque: 0,
      custoCentavos: calculo.custoCentavos,
    });
  }
  catalogo.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return { catalogo, taxaSite };
}

/**
 * Preenche o editor a partir de um link salvo. Itens cujo produto/kit não está
 * mais no catálogo ficam de fora. Editar mantém os dias que faltam; duplicar
 * começa com a validade padrão.
 */
export function linkInicialDoResumo(
  link: LinkPagamentoResumo,
  catalogo: OpcaoCatalogoLink[],
  validadeDias: number
): LinkInicialEditor {
  const valores = new Set(catalogo.map((o) => o.valor));
  return {
    itens: link.itens
      .map((item) => ({
        valor: `${item.produtoId}:${item.variacaoId ?? ""}`,
        quantidade: item.quantidade,
        precoCentavos: item.precoCentavos,
      }))
      .filter((item) => valores.has(item.valor)),
    clienteNome: link.clienteNome ?? "",
    observacao: link.observacao ?? "",
    freteGratis: link.freteGratis,
    validadeDias,
  };
}
