import type { ObjectId } from "mongodb";

export const ROMANEIOS_COLLECTION = "romaneios";

export const MAXIMO_LUGARES_ROMANEIO = 20;
export const MAXIMO_ITENS_LUGAR = 100;
export const MAXIMO_PAGAMENTOS_LUGAR = 50;
export const MAXIMO_QUANTIDADE_ITEM = 9999;

/** De onde veio a peça: o nome e o preço são copiados na inclusão e não acompanham a origem. */
export type OrigemItemRomaneio = "produto" | "tempoImpressao" | "livre";

export const ROTULO_ORIGEM: Record<OrigemItemRomaneio, string> = {
  produto: "Produto",
  tempoImpressao: "Tempo de impressão",
  livre: "Item livre",
};

export type FormaPagamento = "pix" | "dinheiro" | "cartao" | "transferencia" | "outro";

export const FORMAS_PAGAMENTO: FormaPagamento[] = ["pix", "dinheiro", "cartao", "transferencia", "outro"];

export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
  outro: "Outro",
};

export type StatusLugar = "aberto" | "acertado";

export interface ItemRomaneio {
  /** Estável entre edições: chave da linha na tela. */
  id: string;
  origem: OrigemItemRomaneio;
  /** Id do produto ou do plano do Tempo de Impressão; ausente no item livre. */
  origemId?: string;
  nome: string;
  precoCentavos: number;
  levada: number;
  vendida: number;
  devolvida: number;
}

export interface PagamentoRomaneio {
  id: string;
  valorCentavos: number;
  /** "YYYY-MM-DD". */
  data: string;
  forma: FormaPagamento;
  observacao?: string;
}

/** Onde as peças ficam (casa, loja, ponto de venda) — o acerto é feito por lugar. */
export interface LugarRomaneio {
  id: string;
  nome: string;
  contato?: string;
  /** Quem levou as peças até o lugar (ex.: "irmão"). */
  levadoPor?: string;
  status: StatusLugar;
  /** "YYYY-MM-DD", só quando acertado. */
  acertadoEm?: string;
  itens: ItemRomaneio[];
  pagamentos: PagamentoRomaneio[];
}

/**
 * Romaneio de consignação (specs/038): uma saída de peças, espalhada por um ou
 * mais lugares. O status do romaneio é derivado dos lugares e não é gravado.
 */
export interface Romaneio {
  _id?: ObjectId;
  nome: string;
  /** "YYYY-MM-DD". */
  dataSaida: string;
  observacao?: string;
  lugares: LugarRomaneio[];
  criadoEm: Date;
  atualizadoEm: Date;
}

/** O que a tela e a API trocam: o documento sem `_id`/datas do Mongo. */
export interface RomaneioJson {
  id: string;
  nome: string;
  dataSaida: string;
  observacao?: string;
  lugares: LugarRomaneio[];
}
