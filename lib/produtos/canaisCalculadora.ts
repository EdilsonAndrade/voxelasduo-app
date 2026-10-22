import type { CalculadoraValoresV2 } from "@/lib/models/calculoPreco";
import {
  ADICIONAL_SHOPEE_CPF_CENTAVOS,
  faixaUnica,
  faixasMercadoLivre,
  faixasShopee,
  type DetalheVenda,
  type FaixaTaxa,
} from "./calculadoraRapida";
import { TAXA_PAGAMENTO_FIXA } from "./impressoras";

export type CanalVenda = "direta" | "shopee" | "mercadoLivre";

export const NOME_CANAL: Record<CanalVenda, string> = {
  direta: "Venda direta",
  shopee: "Shopee",
  mercadoLivre: "Mercado Livre",
};

/** Como um canal cobra: faixas de taxa (% + fixa), custos fixos por pedido e o que compõe cada parte. */
export interface CanalMontado {
  canal: CanalVenda;
  faixas: FaixaTaxa[];
  /** Frete grátis (venda direta) e cupom próprio (Shopee): custo por pedido, fora do custo da peça. */
  custoVendaCentavos: number;
  /** Shopee: adicional por item de CPF com mais de 450 pedidos (já somado na taxa fixa das faixas). */
  adicionalCpfCentavos: number;
  /** Shopee: comissão extra da campanha de destaque (já somada no % das faixas). */
  campanhaPercentual: number;
  /** Venda direta: taxa da forma de pagamento (é o % das faixas). */
  pagamentoPercentual: number;
  freteCentavos: number;
  cupomCentavos: number;
}

function numero(texto: string | undefined): number {
  return Number((texto ?? "").trim().replace(",", "."));
}

/** Vazio = 0; inválido/negativo = NaN. */
function opcional(texto: string | undefined): number {
  if ((texto ?? "").trim() === "") return 0;
  const n = numero(texto);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

function centavos(texto: string | undefined): number {
  return Math.round(opcional(texto) * 100);
}

/** Taxas de um canal com o que foi escolhido na calculadora. `null` = algum valor digitado inválido. */
export function montarCanal(canal: CanalVenda, v: CalculadoraValoresV2): CanalMontado | null {
  const base = { canal, custoVendaCentavos: 0, adicionalCpfCentavos: 0, campanhaPercentual: 0, pagamentoPercentual: 0, freteCentavos: 0, cupomCentavos: 0 };

  if (canal === "direta") {
    const d = v.vendaDireta;
    const pagamento =
      TAXA_PAGAMENTO_FIXA[d.pagamento] ?? opcional(d.pagamento === "pix" ? d.taxaPixPercentual : d.taxaOutraPercentual);
    const frete = d.frete === "gratis" ? centavos(d.custoEnvioReais) : 0;
    if (!Number.isFinite(pagamento) || !Number.isFinite(frete) || pagamento >= 100) return null;
    return { ...base, faixas: faixaUnica(pagamento, 0), pagamentoPercentual: pagamento, freteCentavos: frete, custoVendaCentavos: frete };
  }

  const c = v.canais[canal];
  if (canal === "mercadoLivre") {
    const taxa = numero(c.taxaPercentual);
    const fixa = opcional(c.taxaFixaReais);
    if (!(taxa >= 0) || !Number.isFinite(fixa)) return null;
    return { ...base, faixas: faixasMercadoLivre(taxa, Math.round(fixa * 100)) };
  }

  // Shopee
  const adicionalCpf = c.tipoConta !== "cnpj" && c.cpfAcima450Pedidos === true;
  let faixas: FaixaTaxa[];
  if (c.taxaPorFaixa !== false) {
    faixas = faixasShopee(adicionalCpf);
  } else {
    const taxa = numero(c.taxaPercentual);
    const fixa = opcional(c.taxaFixaReais);
    if (!(taxa >= 0) || !Number.isFinite(fixa)) return null;
    faixas = faixaUnica(taxa, Math.round(fixa * 100) + (adicionalCpf ? ADICIONAL_SHOPEE_CPF_CENTAVOS : 0));
  }
  const campanha = c.campanhaDestaque ? opcional(c.campanhaPercentual) : 0;
  const cupom = c.cupomAtivo ? centavos(c.cupomReais) : 0;
  if (!Number.isFinite(campanha) || !Number.isFinite(cupom)) return null;

  return {
    ...base,
    faixas: faixas.map((f) => ({ ...f, percentual: f.percentual + campanha })),
    adicionalCpfCentavos: adicionalCpf ? ADICIONAL_SHOPEE_CPF_CENTAVOS : 0,
    campanhaPercentual: campanha,
    cupomCentavos: cupom,
    custoVendaCentavos: cupom,
  };
}

export interface LinhaTaxa {
  rotulo: string;
  centavos: number;
  /**
   * Não sai do repasse do pedido: o anúncio é pago pelo saldo de Ads, o imposto
   * e o frete grátis da venda direta saem do seu bolso depois.
   */
  foraDoPedido?: boolean;
}

function porcento(n: number): string {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/**
 * Para onde vai o dinheiro do canal numa venda, linha a linha (card "Total de
 * taxas do canal"): comissão, campanha, taxa fixa, adicional CPF, pagamento,
 * imposto, anúncio, frete grátis e cupom. Só as linhas com valor.
 */
export function detalharTaxas(canal: CanalMontado, venda: DetalheVenda, precoCentavos: number, impostoPercentual: number): LinhaTaxa[] {
  const linhas: LinhaTaxa[] = [];
  const percentualCanal = venda.faixa.percentual - canal.campanhaPercentual;
  const fixa = venda.faixa.fixaCentavos - canal.adicionalCpfCentavos;

  if (canal.canal === "direta") {
    linhas.push({ rotulo: `Pagamento ${porcento(canal.pagamentoPercentual)}`, centavos: Math.round((precoCentavos * canal.pagamentoPercentual) / 100) });
  } else {
    linhas.push({ rotulo: `Comissão ${porcento(percentualCanal)}`, centavos: Math.round((precoCentavos * percentualCanal) / 100) });
    if (canal.campanhaPercentual > 0) {
      linhas.push({ rotulo: `Campanha de destaque ${porcento(canal.campanhaPercentual)}`, centavos: Math.round((precoCentavos * canal.campanhaPercentual) / 100) });
    }
    linhas.push({ rotulo: canal.canal === "mercadoLivre" ? "Custo fixo (abaixo de R$ 79)" : "Taxa fixa", centavos: fixa });
    if (canal.adicionalCpfCentavos > 0) linhas.push({ rotulo: "Adicional CPF (+450 pedidos)", centavos: canal.adicionalCpfCentavos });
  }
  if (venda.impostoCentavos > 0) linhas.push({ rotulo: `Imposto ${porcento(impostoPercentual)}`, centavos: venda.impostoCentavos, foraDoPedido: true });
  if (venda.anuncioCentavos > 0) linhas.push({ rotulo: "Anúncio (Ads)", centavos: venda.anuncioCentavos, foraDoPedido: true });
  if (canal.freteCentavos > 0) linhas.push({ rotulo: "Frete grátis (você paga o envio)", centavos: canal.freteCentavos, foraDoPedido: true });
  if (canal.cupomCentavos > 0) linhas.push({ rotulo: "Cupom próprio", centavos: canal.cupomCentavos });
  return linhas.filter((l) => l.centavos > 0);
}
