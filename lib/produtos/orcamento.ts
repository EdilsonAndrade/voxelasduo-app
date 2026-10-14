import type { CalculadoraValores } from "@/lib/models/calculoPreco";
import { calcularCustoProducao } from "./custoProducao";
import { montarCustoProducao } from "./custoProducaoFormulario";
import {
  calcularCustoKit,
  calcularPrecoPorMargem,
  calcularProducaoMensal,
  detalharVenda,
  faixaUnica,
  faixasMercadoLivre,
  faixasShopee,
  type FaixaTaxa,
} from "./calculadoraRapida";

export type Marketplace = "shopee" | "mercadoLivre";

/** Meta de ROAS usada quando o cálculo não tem uma válida (cálculos antigos). */
export const ROAS_PADRAO = 8;

/** Máximo de cálculos numa impressão. */
export const MAX_IDS_IMPRESSAO = 60;

function numero(texto: string | undefined): number {
  return Number((texto ?? "").trim().replace(",", "."));
}

/**
 * Faixas de taxa do canal com o que foi digitado na calculadora: Shopee pela
 * tabela por faixa de preço (com o adicional de CPF) ou taxa digitada;
 * Mercado Livre com o custo fixo só abaixo de R$ 79. `null` = taxa inválida.
 */
export function faixasDoCanal(canal: Marketplace, canais: CalculadoraValores["canais"]): FaixaTaxa[] | null {
  const c = canais[canal];
  if (canal === "shopee" && c.taxaPorFaixa !== false) return faixasShopee(c.cpfAcima450Pedidos === true);
  const taxa = numero(c.taxaPercentual);
  const fixa = c.taxaFixaReais.trim() === "" ? 0 : numero(c.taxaFixaReais);
  if (![taxa, fixa].every((n) => Number.isFinite(n) && n >= 0)) return null;
  const fixaCentavos = Math.round(fixa * 100);
  return canal === "mercadoLivre" ? faixasMercadoLivre(taxa, fixaCentavos) : faixaUnica(taxa, fixaCentavos);
}

/** Uma forma de vender o produto (avulso ou kit) no preço que paga o anúncio. */
export interface LinhaOrcamento {
  unidades: number;
  custoPedidoCentavos: number;
  /** `null` = não existe preço que pague taxa, anúncio e margem. */
  precoCentavos: number | null;
  taxaCentavos: number;
  anuncioCentavos: number;
  lucroPedidoCentavos: number;
  margemPercentual: number;
  /** `null` = sem peças no mês informadas. */
  pedidosMes: number | null;
  faturamentoMesCentavos: number | null;
  lucroMesCentavos: number | null;
}

export interface OrcamentoProduto {
  /** `null` = custo incompleto (falta tempo, gramas…). */
  custoPecaCentavos: number | null;
  roas: number;
  margemPercentual: number;
  pecasPorMesa: number | null;
  horasMesaCheia: number | null;
  pecasMes: number | null;
  precoConcorrenteCentavos: number | null;
  /** Unidades que o concorrente vendeu no mês — `null` = não informado. */
  vendasConcorrenteMes: number | null;
  linhas: LinhaOrcamento[];
}

function positivoOuNull(texto: string | undefined): number | null {
  const n = numero(texto);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Números de um cálculo salvo para a impressão dos orçamentos: uma linha
 * avulso e uma de kit, sempre no preço que embute o anúncio na meta de ROAS
 * do cálculo — o preço para anunciar —, qualquer que seja o modo salvo.
 */
export function montarOrcamentoProduto(
  valores: CalculadoraValores,
  canal: Marketplace,
  unidadesKit: number
): OrcamentoProduto {
  const roasSalvo = numero(valores.anuncio?.roasMeta);
  const roas = Number.isFinite(roasSalvo) && roasSalvo > 0 ? roasSalvo : ROAS_PADRAO;
  const margemSalva = numero(valores.margemMinimaPrecoPercentual ?? "25");
  const margemPercentual = Number.isFinite(margemSalva) && margemSalva >= 0 && margemSalva < 100 ? margemSalva : 25;

  const producao = valores.producao;
  const pecasPorMesa = positivoOuNull(producao.pecasPorMesa);
  const horasMesaCheia = positivoOuNull(producao.horasMesaCheia);
  const automatico = calcularProducaoMensal({
    pecasPorMesa: numero(producao.pecasPorMesa),
    horasMesaCheia: numero(producao.horasMesaCheia),
    horasPorDia: numero(producao.horasPorDia),
    diasPorMes: numero(producao.diasPorMes),
  });
  const pecasDigitadas = positivoOuNull(valores.pecasPorMes);
  const pecasMes = pecasDigitadas !== null ? Math.floor(pecasDigitadas) : (automatico?.pecasPorMes ?? null);

  const concorrente = positivoOuNull(valores.precoConcorrenteReais);
  const base = {
    roas,
    margemPercentual,
    pecasPorMesa,
    horasMesaCheia,
    pecasMes,
    precoConcorrenteCentavos: concorrente !== null ? Math.round(concorrente * 100) : null,
    vendasConcorrenteMes: positivoOuNull(valores.vendasConcorrenteMes) !== null ? Math.floor(numero(valores.vendasConcorrenteMes)) : null,
  };

  const custoProducao = montarCustoProducao(valores.custo);
  const faixas = faixasDoCanal(canal, valores.canais);
  if (!custoProducao || !faixas) return { ...base, custoPecaCentavos: null, linhas: [] };

  const cogs = calcularCustoProducao(custoProducao);
  const anuncioPercentual = 100 / roas;

  const linhas = [1, unidadesKit].map((unidades): LinhaOrcamento => {
    const custoPedidoCentavos = calcularCustoKit(cogs.totalCentavos, cogs.custoEmbalagemCentavos, unidades);
    const precoCentavos = calcularPrecoPorMargem({
      custoCentavos: custoPedidoCentavos,
      faixas,
      margemPrecoPercentual: margemPercentual,
      anuncioPercentual,
    });
    if (precoCentavos === null) {
      return {
        unidades,
        custoPedidoCentavos,
        precoCentavos: null,
        taxaCentavos: 0,
        anuncioCentavos: 0,
        lucroPedidoCentavos: 0,
        margemPercentual: 0,
        pedidosMes: null,
        faturamentoMesCentavos: null,
        lucroMesCentavos: null,
      };
    }
    const venda = detalharVenda({ precoCentavos, faixas, custoCentavos: custoPedidoCentavos, anuncioPercentual });
    const pedidosMes = pecasMes !== null ? Math.floor(pecasMes / unidades) : null;
    return {
      unidades,
      custoPedidoCentavos,
      precoCentavos,
      taxaCentavos: venda.taxaCentavos,
      anuncioCentavos: venda.anuncioCentavos,
      lucroPedidoCentavos: venda.lucroCentavos,
      margemPercentual: venda.margemPrecoPercentual,
      pedidosMes,
      faturamentoMesCentavos: pedidosMes !== null ? precoCentavos * pedidosMes : null,
      lucroMesCentavos: pedidosMes !== null ? venda.lucroCentavos * pedidosMes : null,
    };
  });

  return { ...base, custoPecaCentavos: cogs.totalCentavos, linhas };
}

/** Ids da query `?ids=a,b,c`: sem vazios nem repetidos, na ordem, no máximo `MAX_IDS_IMPRESSAO`. */
export function idsDaQuery(texto: string | undefined): string[] {
  const ids = (texto ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, MAX_IDS_IMPRESSAO);
}
