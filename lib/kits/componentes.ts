import type { ValoresComponente } from "@/lib/models/kit";
import type { CustoProducao, Produto } from "@/lib/models/produto";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { montarCustoProducao, VAZIO_CUSTO_PRODUCAO } from "@/lib/produtos/custoProducaoFormulario";

/**
 * Valores de um produto como componente de kit (specs/037, research #2):
 * preço do site, peso e tempo da peça (do custo de produção, senão da ficha
 * técnica / do Tempo de Impressão) e o custo **sem a embalagem da peça** — o
 * kit tem uma embalagem só para o conjunto.
 */
export function valoresDoComponente(
  produto: Pick<Produto, "nome" | "preco" | "custoProducao" | "fichaTecnica">,
  minutosTempoImpressao?: number | null
): ValoresComponente {
  const custo = produto.custoProducao;
  const pesoGramas = custo?.pesoPecaGramas ?? produto.fichaTecnica?.pesoGramas ?? null;
  const tempoMinutos =
    custo && custo.tempoImpressaoHoras > 0
      ? Math.round(custo.tempoImpressaoHoras * 60)
      : minutosTempoImpressao && minutosTempoImpressao > 0
        ? minutosTempoImpressao
        : null;

  return {
    nome: produto.nome,
    precoCentavos: produto.preco,
    pesoGramas: pesoGramas !== null && pesoGramas > 0 ? pesoGramas : null,
    tempoMinutos,
    custoCentavos: custo ? custoSemEmbalagem(custo) : null,
  };
}

/** Custo de produção com a embalagem zerada (a taxa de falha continua valendo sobre o resto). */
export function custoSemEmbalagem(custo: CustoProducao): number | null {
  const total = calcularCustoProducao({ ...custo, custoEmbalagemCentavos: 0 }).totalCentavos;
  return Number.isFinite(total) ? total : null;
}

/**
 * Custo de produção de uma peça nova pelo padrão da loja (o mesmo do produto
 * novo), só com peso e tempo digitados. Margem de perda vazia no padrão = 0%.
 * `null` = peso ou tempo inválidos.
 */
export function custoProducaoItemNovo(pesoGramas: number, tempoMinutos: number): CustoProducao | null {
  if (!(pesoGramas > 0) || !(tempoMinutos > 0)) return null;
  return montarCustoProducao({
    ...VAZIO_CUSTO_PRODUCAO,
    pesoPecaGramas: String(pesoGramas),
    tempoImpressaoHoras: String(tempoMinutos / 60),
    margemPerdaPercentual: VAZIO_CUSTO_PRODUCAO.margemPerdaPercentual.trim() || "0",
  });
}
