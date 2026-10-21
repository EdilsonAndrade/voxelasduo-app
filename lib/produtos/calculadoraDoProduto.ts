import type { CalculadoraValoresV2 } from "@/lib/models/calculoPreco";
import type { Produto } from "@/lib/models/produto";
import { valoresPadrao } from "./calculadoraPadrao";
import { normalizarValores } from "./calculadoraValores";
import { custoProducaoParaFormulario } from "./custoProducaoFormulario";

/**
 * Valores da calculadora para avaliar um produto já cadastrado: o custo de
 * produção vira a impressão da mesa (mesma conversão dos cálculos antigos) e o
 * preço atual da Shopee (ou o do site) entra como preço alvo — o resumo mostra
 * o lucro nesse preço e por quanto vender para ter a margem desejada.
 */
export function valoresDoProduto(produto: Produto): CalculadoraValoresV2 {
  const padrao = valoresPadrao();
  const impressao = produto.custoProducao
    ? normalizarValores({ ...padrao, versao: undefined, impressao: undefined, custo: custoProducaoParaFormulario(produto.custoProducao) })
        .impressao
    : padrao.impressao;
  const precoAtualCentavos = produto.precosCanais?.shopee ?? produto.preco;

  return {
    ...padrao,
    impressao,
    precificacao: {
      ...padrao.precificacao,
      ...(precoAtualCentavos > 0 ? { modo: "alvo", precoAlvoReais: (precoAtualCentavos / 100).toFixed(2) } : {}),
    },
  };
}
