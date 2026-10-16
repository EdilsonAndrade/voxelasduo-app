import type { CalculadoraValores } from "@/lib/models/calculoPreco";
import { horasDaMesa, normalizarValores } from "./calculadoraValores";
import { montarCanal } from "./canaisCalculadora";
import { calcularCustoUnidade } from "./custoCalculadora";
import {
  calcularCustoKit,
  calcularPrecoPorMargem,
  calcularProducaoMensal,
  detalharVenda,
} from "./calculadoraRapida";

export type Marketplace = "shopee" | "mercadoLivre";

/** Meta de ROAS usada quando o cálculo não tem uma válida (cálculos antigos). */
export const ROAS_PADRAO = 8;

/** Máximo de cálculos numa impressão. */
export const MAX_IDS_IMPRESSAO = 60;

function numero(texto: string | undefined): number {
  return Number((texto ?? "").trim().replace(",", "."));
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
  /** Preço do concorrente em oferta relâmpago — `null` = não informado. */
  precoOfertaConcorrenteCentavos: number | null;
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
  valoresSalvos: CalculadoraValores,
  canal: Marketplace,
  unidadesKit: number
): OrcamentoProduto {
  const valores = normalizarValores(valoresSalvos);
  const roasSalvo = numero(valores.anuncio?.roasMeta);
  const roas = Number.isFinite(roasSalvo) && roasSalvo > 0 ? roasSalvo : ROAS_PADRAO;
  const margemSalva = numero(valores.margemMinimaPrecoPercentual ?? "25");
  const margemPercentual = Number.isFinite(margemSalva) && margemSalva >= 0 && margemSalva < 100 ? margemSalva : 25;

  const producao = valores.producao;
  const pecasPorMesa = positivoOuNull(valores.impressao.pecasPorMesa);
  const horasMesaCheia = horasDaMesa(valores.impressao);
  const automatico = calcularProducaoMensal({
    pecasPorMesa: numero(valores.impressao.pecasPorMesa),
    horasMesaCheia: horasMesaCheia ?? 0,
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
    precoOfertaConcorrenteCentavos: (() => {
      const oferta = positivoOuNull(valores.precoConcorrenteOfertaReais);
      return oferta !== null ? Math.round(oferta * 100) : null;
    })(),
    vendasConcorrenteMes: positivoOuNull(valores.vendasConcorrenteMes) !== null ? Math.floor(numero(valores.vendasConcorrenteMes)) : null,
  };

  const custo = calcularCustoUnidade(valores.impressao);
  const canalMontado = montarCanal(canal, valores);
  if (!custo || !canalMontado) return { ...base, custoPecaCentavos: null, linhas: [] };

  const faixas = canalMontado.faixas;
  const anuncioPercentual = 100 / roas;
  const impostoNumero = numero(valores.precificacao.impostoPercentual);
  const impostoPercentual = Number.isFinite(impostoNumero) && impostoNumero > 0 && impostoNumero < 100 ? impostoNumero : 0;

  const linhas = [1, unidadesKit].map((unidades): LinhaOrcamento => {
    // Kit: uma embalagem só e o frete/cupom uma vez por pedido.
    const custoPedidoCentavos =
      calcularCustoKit(custo.totalCentavos, custo.embalagemCentavos, unidades) + canalMontado.custoVendaCentavos;
    const precoCentavos = calcularPrecoPorMargem({
      custoCentavos: custoPedidoCentavos,
      faixas,
      margemPrecoPercentual: margemPercentual,
      anuncioPercentual,
      impostoPercentual,
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
    const venda = detalharVenda({ precoCentavos, faixas, custoCentavos: custoPedidoCentavos, anuncioPercentual, impostoPercentual });
    const pedidosMes = pecasMes !== null ? Math.floor(pecasMes / unidades) : null;
    return {
      unidades,
      custoPedidoCentavos,
      precoCentavos,
      taxaCentavos: venda.taxaCentavos + venda.impostoCentavos + canalMontado.custoVendaCentavos,
      anuncioCentavos: venda.anuncioCentavos,
      lucroPedidoCentavos: venda.lucroCentavos,
      margemPercentual: venda.margemPrecoPercentual,
      pedidosMes,
      faturamentoMesCentavos: pedidosMes !== null ? precoCentavos * pedidosMes : null,
      lucroMesCentavos: pedidosMes !== null ? venda.lucroCentavos * pedidosMes : null,
    };
  });

  return { ...base, custoPecaCentavos: custo.totalCentavos, linhas };
}

/** Ids da query `?ids=a,b,c`: sem vazios nem repetidos, na ordem, no máximo `MAX_IDS_IMPRESSAO`. */
export function idsDaQuery(texto: string | undefined): string[] {
  const ids = (texto ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, MAX_IDS_IMPRESSAO);
}
