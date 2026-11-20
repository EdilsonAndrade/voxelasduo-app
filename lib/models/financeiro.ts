import type { ObjectId } from "mongodb";

/** Vendas lançadas à mão (pix, dinheiro, maquininha…) — fora do checkout do site. */
export const LANCAMENTOS_VENDA_COLLECTION = "lancamentosVenda";
/** Impressoras compradas — base do "as impressoras já se pagaram?". */
export const IMPRESSORAS_COLLECTION = "impressoras";
/** Gastos do negócio: insumos comprados e despesas que não são de uma peça. */
export const DESPESAS_COLLECTION = "despesas";

export const CATEGORIAS_DESPESA = [
  "filamento",
  "embalagem",
  "insumos",
  "impostos",
  "anuncios",
  "ferramentas",
  "manutencao",
  "outros",
] as const;
export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number];

export const ROTULO_CATEGORIA_DESPESA: Record<CategoriaDespesa, string> = {
  filamento: "Filamento",
  embalagem: "Embalagem",
  insumos: "Outros insumos",
  impostos: "Impostos / MEI",
  anuncios: "Anúncios",
  ferramentas: "Ferramentas",
  manutencao: "Peças e manutenção",
  outros: "Outros",
};

/**
 * Insumos já entram no custo de cada peça pela calculadora — a compra só
 * aparece no "quanto já gastamos", nunca desconta do lucro (senão conta duas vezes).
 */
export const CATEGORIAS_INSUMO: readonly CategoriaDespesa[] = ["filamento", "embalagem", "insumos"];
export const ehInsumo = (categoria: CategoriaDespesa) => CATEGORIAS_INSUMO.includes(categoria);

export const MEIOS_PAGAMENTO = ["pix", "dinheiro", "cartao", "link", "outro"] as const;
export type MeioPagamento = (typeof MEIOS_PAGAMENTO)[number];

export const ROTULO_MEIO_PAGAMENTO: Record<MeioPagamento, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão (maquininha)",
  link: "Link avulso (fora do site)",
  outro: "Outro",
};

export const ORIGENS_ITEM_VENDA = ["produto", "calculo", "avulso"] as const;
export type OrigemItemVenda = (typeof ORIGENS_ITEM_VENDA)[number];

export const LIMITES_LANCAMENTO = {
  itensMax: 50,
  quantidadeMax: 9_999,
  valorMaxCentavos: 100_000_000,
  textoMax: 200,
} as const;

/** Um produto da venda. Custo e depreciação são os do dia do lançamento. */
export interface ItemLancamento {
  origem: OrigemItemVenda;
  produtoId?: string;
  variacaoId?: string;
  /** Cálculo da calculadora — inclusive o criado a partir de um item digitado. */
  calculoId?: string;
  nome: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  /** Custo de produção da unidade — `null` = não informado (o lucro sai otimista). */
  custoUnitarioCentavos: number | null;
  /** Parte do custo que é desgaste da impressora — conta como retorno das impressoras. */
  depreciacaoUnitariaCentavos: number;
}

export interface LancamentoVenda {
  _id?: ObjectId;
  data: Date;
  cliente?: string;
  meio: MeioPagamento;
  itens: ItemLancamento[];
  /** Taxa do meio de pagamento na venda inteira, em centavos. */
  taxaCentavos: number;
  observacao?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Impressora {
  _id?: ObjectId;
  nome: string;
  dataCompra: Date;
  valorCentavos: number;
  observacao?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Despesa {
  _id?: ObjectId;
  data: Date;
  categoria: CategoriaDespesa;
  descricao: string;
  valorCentavos: number;
  observacao?: string;
  /** Compra de um insumo do catálogo — lançada pela aba Insumos. */
  insumoId?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DespesaPayload {
  /** `AAAA-MM-DD` */
  data: string;
  categoria: CategoriaDespesa;
  descricao: string;
  valorCentavos: number;
  observacao?: string;
}

/** Corpo de criação/edição de um item. */
export interface ItemLancamentoPayload {
  origem: OrigemItemVenda;
  produtoId?: string;
  variacaoId?: string;
  calculoId?: string;
  nome: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  custoUnitarioCentavos: number | null;
  /** Item digitado: cria um cálculo com este nome na calculadora. */
  levarParaCalculadora?: boolean;
}

export interface LancamentoPayload {
  /** `AAAA-MM-DD` */
  data: string;
  cliente?: string;
  meio: MeioPagamento;
  itens: ItemLancamentoPayload[];
  taxaCentavos: number;
  observacao?: string;
}

export interface ImpressoraPayload {
  nome: string;
  /** `AAAA-MM-DD` */
  dataCompra: string;
  valorCentavos: number;
  observacao?: string;
}

/** Versões para a tela (datas em ISO, ids em texto). */
export interface LancamentoVendaJson extends Omit<LancamentoVenda, "_id" | "data" | "criadoEm" | "atualizadoEm"> {
  id: string;
  data: string;
}

export interface ImpressoraJson extends Omit<Impressora, "_id" | "dataCompra" | "criadoEm" | "atualizadoEm"> {
  id: string;
  dataCompra: string;
}

export interface DespesaJson extends Omit<Despesa, "_id" | "data" | "criadoEm" | "atualizadoEm"> {
  id: string;
  data: string;
}
