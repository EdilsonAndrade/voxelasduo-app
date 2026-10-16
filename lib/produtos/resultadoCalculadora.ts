import type { CalculadoraValoresV2 } from "@/lib/models/calculoPreco";
import {
  calcularLimiteAnuncio,
  calcularPrecoPorMargem,
  calcularProducaoMensal,
  detalharVenda,
  faixaUnica,
  type DetalheVenda,
  type LimiteAnuncio,
  type ProducaoMensal,
} from "./calculadoraRapida";
import { detalharTaxas, montarCanal, type CanalMontado, type CanalVenda, type LinhaTaxa } from "./canaisCalculadora";
import { horasDaMesa } from "./calculadoraValores";
import { calcularCustoUnidade, camposFaltandoCusto, type CustoUnidade } from "./custoCalculadora";

export const CANAIS_VENDA: CanalVenda[] = ["direta", "shopee", "mercadoLivre"];

export interface ResultadoCanal {
  canal: CanalMontado;
  /** Anúncio embutido no preço deste canal, em % (venda direta não tem). */
  anuncioPercentual: number;
  /** Custo de um pedido avulso: peça + frete grátis/cupom. */
  custoPedidoCentavos: number;
  /** Preço que deixa a margem mínima — `null` = impossível. */
  precoMargemCentavos: number | null;
  /** Preço pela margem sem anúncio (referência do modo "embutido"). */
  precoSemAnuncioCentavos: number | null;
  /** Preço praticado: o alvo (modo "alvo") ou o da margem. `null` = sem preço. */
  precoCentavos: number | null;
  /** Preço cheio para anunciar com a promoção (o comprador paga `precoCentavos`). */
  precoCheioCentavos: number | null;
  venda: DetalheVenda | null;
  taxas: LinhaTaxa[];
  totalTaxasCentavos: number;
  /** Preço ÷ custo por unidade. */
  markup: number | null;
  limite: LimiteAnuncio | null;
}

export interface ResultadoCalculadora {
  custo: CustoUnidade | null;
  faltando: string[];
  margemPercentual: number | null;
  impostoPercentual: number;
  roas: number | null;
  /** Anúncio embutido nos marketplaces (modo "embutido"), em %. */
  anuncioEmbutidoPercentual: number;
  modo: "margem" | "alvo";
  precoAlvoCentavos: number | null;
  producao: ProducaoMensal | null;
  /** Peças no mês usadas nas contas (digitado ou automático). */
  pecasMes: number;
  canais: Record<CanalVenda, ResultadoCanal | null>;
  /** Preço do site próprio (produto rascunho): margem mínima, taxa do site, sem anúncio. */
  precoSiteCentavos: number | null;
}

function numero(texto: string | undefined): number {
  return Number((texto ?? "").trim().replace(",", "."));
}

function opcional(texto: string | undefined): number {
  if ((texto ?? "").trim() === "") return 0;
  const n = numero(texto);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function calcularResultado(
  v: CalculadoraValoresV2,
  taxaSite: { percentual: number; fixaCentavos: number }
): ResultadoCalculadora {
  const custo = calcularCustoUnidade(v.impressao);
  const faltando = camposFaltandoCusto(v.impressao);

  const margemBruta = numero(v.margemMinimaPrecoPercentual);
  const margemPercentual =
    (v.margemMinimaPrecoPercentual ?? "").trim() !== "" && Number.isFinite(margemBruta) && margemBruta >= 0 && margemBruta < 100
      ? margemBruta
      : null;
  const impostoBruto = opcional(v.precificacao.impostoPercentual);
  const impostoPercentual = Number.isFinite(impostoBruto) && impostoBruto < 100 ? impostoBruto : 0;

  const roasBruto = numero(v.anuncio?.roasMeta);
  const roas = Number.isFinite(roasBruto) && roasBruto > 0 ? roasBruto : null;
  const anuncioEmbutidoPercentual = v.anuncio?.modo === "embutido" && roas !== null ? 100 / roas : 0;

  const modo = v.precificacao.modo;
  const alvo = numero(v.precificacao.precoAlvoReais);
  const precoAlvoCentavos = modo === "alvo" && alvo > 0 ? Math.round(alvo * 100) : null;
  const promocao = v.precificacao.promocaoAtiva ? opcional(v.precificacao.promocaoPercentual) : 0;
  const promocaoValida = Number.isFinite(promocao) && promocao > 0 && promocao < 100 ? promocao : 0;

  const producao = calcularProducaoMensal({
    pecasPorMesa: numero(v.impressao.pecasPorMesa),
    horasMesaCheia: horasDaMesa(v.impressao) ?? 0,
    horasPorDia: numero(v.producao.horasPorDia),
    diasPorMes: numero(v.producao.diasPorMes),
  });
  const pecasDigitadas = numero(v.pecasPorMes);
  const pecasMes = Math.max(0, Math.floor(Number.isFinite(pecasDigitadas) && pecasDigitadas > 0 ? pecasDigitadas : (producao?.pecasPorMes ?? 0)));

  function resultadoCanal(nome: CanalVenda): ResultadoCanal | null {
    const canal = montarCanal(nome, v);
    if (!custo || !canal) return null;
    const anuncioPercentual = nome === "direta" ? 0 : anuncioEmbutidoPercentual;
    const custoPedidoCentavos = custo.totalCentavos + canal.custoVendaCentavos;
    const base = { custoCentavos: custoPedidoCentavos, faixas: canal.faixas, impostoPercentual };

    const precoMargemCentavos =
      margemPercentual !== null ? calcularPrecoPorMargem({ ...base, margemPrecoPercentual: margemPercentual, anuncioPercentual }) : null;
    const precoSemAnuncioCentavos =
      margemPercentual !== null ? calcularPrecoPorMargem({ ...base, margemPrecoPercentual: margemPercentual, anuncioPercentual: 0 }) : null;
    const precoCentavos = modo === "alvo" ? precoAlvoCentavos : precoMargemCentavos;

    if (precoCentavos === null) {
      return { canal, anuncioPercentual, custoPedidoCentavos, precoMargemCentavos, precoSemAnuncioCentavos, precoCentavos, precoCheioCentavos: null, venda: null, taxas: [], totalTaxasCentavos: 0, markup: null, limite: null };
    }
    const venda = detalharVenda({ ...base, precoCentavos, anuncioPercentual });
    const taxas = detalharTaxas(canal, venda, precoCentavos, impostoPercentual);
    return {
      canal,
      anuncioPercentual,
      custoPedidoCentavos,
      precoMargemCentavos,
      precoSemAnuncioCentavos,
      precoCentavos,
      precoCheioCentavos: promocaoValida > 0 ? Math.ceil(precoCentavos / (1 - promocaoValida / 100)) : null,
      venda,
      taxas,
      totalTaxasCentavos: taxas.reduce((t, l) => t + l.centavos, 0),
      markup: custo.totalCentavos > 0 ? precoCentavos / custo.totalCentavos : null,
      limite:
        margemPercentual !== null
          ? calcularLimiteAnuncio({
              precoCentavos,
              taxaCentavos: venda.taxaCentavos + venda.impostoCentavos + canal.custoVendaCentavos,
              custoCentavos: custo.totalCentavos,
              margemMinimaPrecoPercentual: margemPercentual,
            })
          : null,
    };
  }

  const precoSiteCentavos =
    custo && margemPercentual !== null
      ? calcularPrecoPorMargem({
          custoCentavos: custo.totalCentavos,
          faixas: faixaUnica(taxaSite.percentual, taxaSite.fixaCentavos),
          margemPrecoPercentual: margemPercentual,
          anuncioPercentual: 0,
          impostoPercentual,
        })
      : null;

  return {
    custo,
    faltando,
    margemPercentual,
    impostoPercentual,
    roas,
    anuncioEmbutidoPercentual,
    modo,
    precoAlvoCentavos,
    producao,
    pecasMes,
    canais: {
      direta: resultadoCanal("direta"),
      shopee: resultadoCanal("shopee"),
      mercadoLivre: resultadoCanal("mercadoLivre"),
    },
    precoSiteCentavos,
  };
}
