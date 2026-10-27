import type { CalculadoraValoresV2 } from "@/lib/models/calculoPreco";
import type { CustoProducao, Produto } from "@/lib/models/produto";
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

/**
 * Valores da calculadora para um item do Tempo de Impressão que ainda não é
 * produto (specs/035): a soma dos tempos das partes vira o tempo da mesa, com
 * uma peça por mesa — o conjunto inteiro é a unidade vendida.
 */
export function valoresDoTempoImpressao(totalMinutos: number): CalculadoraValoresV2 {
  const padrao = valoresPadrao();
  return {
    ...padrao,
    impressao: {
      ...padrao.impressao,
      pecasPorMesa: "1",
      tempoHoras: totalMinutos > 0 ? String(Math.floor(totalMinutos / 60)) : "",
      tempoMinutos: totalMinutos > 0 ? String(totalMinutos % 60) : "",
    },
  };
}

/**
 * Valores da calculadora para um kit que ainda não virou produto (specs/037):
 * o custo agregado do kit entra como o custo de produção de uma peça e o
 * preço escolhido no montador vira o preço alvo.
 */
export function valoresDoKit(custoProducao: CustoProducao, precoCentavos: number): CalculadoraValoresV2 {
  return valoresDoProduto({ custoProducao, preco: precoCentavos } as Produto);
}
