import type { CalculadoraValoresV2 } from "@/lib/models/calculoPreco";
import type { CustoProducao, PrecosCanaisProduto, TaxasCanaisProduto } from "@/lib/models/produto";
import { detalharVenda, faixaUnica } from "./calculadoraRapida";
import { paraCustoProducao } from "./custoCalculadora";
import type { ResultadoCalculadora } from "./resultadoCalculadora";

export const DESCRICAO_RASCUNHO_CALCULO = "Rascunho criado pela calculadora de preço — completar a descrição.";

/** Campos do produto rascunho que saem de um cálculo de preço. */
export interface RascunhoDoCalculo {
  preco: number;
  custoProducao: CustoProducao;
  taxasCanais: TaxasCanaisProduto;
  precosCanais: PrecosCanaisProduto;
}

function numero(texto: string | undefined): number {
  return Number((texto ?? "").trim().replace(",", "."));
}

/**
 * Preço, custo e taxas do produto rascunho criado a partir do cálculo — o
 * mesmo que o botão "criar produto" da calculadora grava. `null` = o cálculo
 * ainda não tem custo ou preço do site (faltam dados).
 */
export function rascunhoDoCalculo(
  valores: CalculadoraValoresV2,
  res: ResultadoCalculadora,
  taxaSite: { percentual: number; fixaCentavos: number }
): RascunhoDoCalculo | null {
  if (!res.custo || res.precoSiteCentavos === null) return null;

  const precosCanais: PrecosCanaisProduto = {};
  const shopee = res.canais.shopee?.precoCentavos;
  const mercadoLivre = res.canais.mercadoLivre?.precoCentavos;
  if (shopee != null) precosCanais.shopee = shopee;
  if (mercadoLivre != null) precosCanais.mercadoLivre = mercadoLivre;

  // O cadastro guarda a margem em % do preço, a mesma régua da calculadora.
  const vendaSite = detalharVenda({
    precoCentavos: res.precoSiteCentavos,
    faixas: faixaUnica(taxaSite.percentual, taxaSite.fixaCentavos),
    custoCentavos: res.custo.totalCentavos,
    anuncioPercentual: 0,
    impostoPercentual: res.impostoPercentual,
  });
  const margemPreco = Math.min(99, Math.max(0, Math.round(vendaSite.margemPrecoPercentual)));

  return {
    preco: res.precoSiteCentavos,
    custoProducao: paraCustoProducao(valores.impressao, res.custo),
    taxasCanais: {
      shopeeTaxaPercentual: res.canais.shopee?.venda?.faixa.percentual ?? numero(valores.canais.shopee.taxaPercentual),
      margemDesejadaPercentual: margemPreco,
    },
    precosCanais,
  };
}
