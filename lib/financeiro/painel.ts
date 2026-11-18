import { mesDe, rotuloMes, ultimosMeses } from "./datas";

/** De onde veio a venda — pedidos do sistema ou lançamento à mão por meio de pagamento. */
export const ORIGENS_VENDA = [
  "site",
  "link",
  "mercado_livre",
  "shopee",
  "manual_pix",
  "manual_dinheiro",
  "manual_cartao",
  "manual_link",
  "manual_outro",
] as const;
export type OrigemVenda = (typeof ORIGENS_VENDA)[number];

export const ROTULO_ORIGEM_VENDA: Record<OrigemVenda, string> = {
  site: "Site",
  link: "Link de pagamento",
  mercado_livre: "Mercado Livre",
  shopee: "Shopee",
  manual_pix: "Pix por fora",
  manual_dinheiro: "Dinheiro",
  manual_cartao: "Maquininha",
  manual_link: "Link avulso",
  manual_outro: "Outros",
};

/** Uma venda, venha de onde vier, já com receita, taxa e custo em centavos. */
export interface VendaPainel {
  data: Date;
  origem: OrigemVenda;
  /** O que o cliente pagou pelos produtos (sem o frete, que vai para os Correios). */
  receitaCentavos: number;
  taxaCentavos: number;
  /** Custo de produção, já com o desgaste da impressora. */
  custoCentavos: number;
  /** Parte do custo que é desgaste da impressora. */
  depreciacaoCentavos: number;
  /** Unidades vendidas sem custo conhecido (contam como custo zero). */
  unidadesSemCusto: number;
}

export interface Totais {
  vendas: number;
  receitaCentavos: number;
  taxaCentavos: number;
  custoCentavos: number;
  lucroCentavos: number;
  /** Lucro + desgaste: o que sobrou de verdade para pagar as impressoras. */
  retornoCentavos: number;
  /** Lucro ÷ receita, em % — `null` sem receita. */
  margemPercentual: number | null;
  unidadesSemCusto: number;
}

export const lucroDa = (v: VendaPainel) => v.receitaCentavos - v.taxaCentavos - v.custoCentavos;

export function somar(vendas: VendaPainel[]): Totais {
  const t = vendas.reduce(
    (acc, v) => ({
      receita: acc.receita + v.receitaCentavos,
      taxa: acc.taxa + v.taxaCentavos,
      custo: acc.custo + v.custoCentavos,
      depreciacao: acc.depreciacao + v.depreciacaoCentavos,
      semCusto: acc.semCusto + v.unidadesSemCusto,
    }),
    { receita: 0, taxa: 0, custo: 0, depreciacao: 0, semCusto: 0 }
  );
  const lucro = t.receita - t.taxa - t.custo;
  return {
    vendas: vendas.length,
    receitaCentavos: t.receita,
    taxaCentavos: t.taxa,
    custoCentavos: t.custo,
    lucroCentavos: lucro,
    retornoCentavos: lucro + t.depreciacao,
    margemPercentual: t.receita > 0 ? Math.round((lucro / t.receita) * 1000) / 10 : null,
    unidadesSemCusto: t.semCusto,
  };
}

export const PERIODOS = ["mes", "30d", "ano", "tudo"] as const;
export type Periodo = (typeof PERIODOS)[number];
export const ROTULO_PERIODO: Record<Periodo, string> = {
  mes: "Este mês",
  "30d": "Últimos 30 dias",
  ano: "Este ano",
  tudo: "Desde o início",
};

export function filtrarPeriodo(vendas: VendaPainel[], periodo: Periodo, agora: Date): VendaPainel[] {
  if (periodo === "tudo") return vendas;
  if (periodo === "30d") {
    const inicio = agora.getTime() - 30 * 24 * 60 * 60 * 1000;
    return vendas.filter((v) => v.data.getTime() >= inicio && v.data.getTime() <= agora.getTime());
  }
  const atual = mesDe(agora);
  const prefixo = periodo === "mes" ? atual : atual.slice(0, 4);
  return vendas.filter((v) => mesDe(v.data).startsWith(prefixo));
}

export interface MesPainel {
  mes: string;
  rotulo: string;
  receitaCentavos: number;
  lucroCentavos: number;
  vendas: number;
}

/** Receita e lucro de cada um dos últimos `meses` meses (mês sem venda = zero). */
export function porMes(vendas: VendaPainel[], agora: Date, meses = 12): MesPainel[] {
  const lista = ultimosMeses(agora, meses);
  const mapa = new Map(lista.map((mes) => [mes, { receita: 0, lucro: 0, vendas: 0 }]));
  for (const v of vendas) {
    const linha = mapa.get(mesDe(v.data));
    if (!linha) continue;
    linha.receita += v.receitaCentavos;
    linha.lucro += lucroDa(v);
    linha.vendas += 1;
  }
  return lista.map((mes) => {
    const l = mapa.get(mes)!;
    return { mes, rotulo: rotuloMes(mes), receitaCentavos: l.receita, lucroCentavos: l.lucro, vendas: l.vendas };
  });
}

export interface OrigemPainel extends Totais {
  origem: OrigemVenda;
  rotulo: string;
}

/** Totais por origem, do maior lucro ao menor — origens sem venda ficam de fora. */
export function porOrigem(vendas: VendaPainel[]): OrigemPainel[] {
  return ORIGENS_VENDA.map((origem) => ({
    origem,
    rotulo: ROTULO_ORIGEM_VENDA[origem],
    ...somar(vendas.filter((v) => v.origem === origem)),
  }))
    .filter((o) => o.vendas > 0)
    .sort((a, b) => b.lucroCentavos - a.lucroCentavos);
}

export interface ImpressoraPagamento {
  id: string;
  nome: string;
  dataCompra: Date;
  valorCentavos: number;
  /** Quanto do valor dela o retorno já cobriu (0 até `valorCentavos`). */
  pagoCentavos: number;
  paga: boolean;
}

export interface Payback {
  investidoCentavos: number;
  retornoCentavos: number;
  /** Retorno ÷ investido, em % (pode passar de 100). `null` sem impressora. */
  percentual: number | null;
  faltaCentavos: number;
  /** Na ordem de compra: o retorno paga primeiro a mais antiga. */
  impressoras: ImpressoraPagamento[];
  /** Retorno médio por mês nos últimos 3 meses fechados + o atual. */
  retornoMedioMesCentavos: number;
  /** Meses para quitar no ritmo médio — `null` = já quitou ou sem ritmo positivo. */
  mesesParaQuitar: number | null;
}

export function calcularPayback(
  vendas: VendaPainel[],
  impressoras: { id: string; nome: string; dataCompra: Date; valorCentavos: number }[],
  agora: Date
): Payback {
  const { retornoCentavos } = somar(vendas);
  const ordenadas = [...impressoras].sort((a, b) => a.dataCompra.getTime() - b.dataCompra.getTime());
  const investido = ordenadas.reduce((s, i) => s + i.valorCentavos, 0);

  let saldo = Math.max(0, retornoCentavos);
  const lista = ordenadas.map((imp) => {
    const pago = Math.min(saldo, imp.valorCentavos);
    saldo -= pago;
    return { ...imp, pagoCentavos: pago, paga: pago >= imp.valorCentavos };
  });

  const meses = new Set(ultimosMeses(agora, 4));
  const recente = somar(vendas.filter((v) => meses.has(mesDe(v.data)))).retornoCentavos;
  const retornoMedio = Math.round(recente / 4);
  const falta = Math.max(0, investido - retornoCentavos);

  return {
    investidoCentavos: investido,
    retornoCentavos,
    percentual: investido > 0 ? Math.round((retornoCentavos / investido) * 1000) / 10 : null,
    faltaCentavos: falta,
    impressoras: lista,
    retornoMedioMesCentavos: retornoMedio,
    mesesParaQuitar: falta > 0 && retornoMedio > 0 ? Math.ceil(falta / retornoMedio) : null,
  };
}
