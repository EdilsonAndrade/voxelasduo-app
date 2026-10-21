import type { ObjectId } from "mongodb";

/** Controle manual de produção e vendas por produto — um documento por produto. */
export const CONTROLE_VENDAS_COLLECTION = "controleVendas";

export const CANAIS_CONTROLE = ["site", "mercadoLivre", "shopee", "direta"] as const;
export type CanalControle = (typeof CANAIS_CONTROLE)[number];

export const ROTULO_CANAL_CONTROLE: Record<CanalControle, string> = {
  site: "Site (Mercado Pago)",
  mercadoLivre: "Mercado Livre",
  shopee: "Shopee",
  direta: "Venda direta",
};

/**
 * Site e Mercado Livre já baixam o estoque sozinhos (pagamento/webhook) — a
 * venda lançada à mão nesses canais nasce sem baixa para não contar duas vezes.
 */
export const BAIXA_ESTOQUE_PADRAO: Record<CanalControle, boolean> = {
  site: false,
  mercadoLivre: false,
  shopee: true,
  direta: true,
};

export const LIMITES_CONTROLE = {
  quantidadeMax: 99_999,
  clienteMax: 120,
  valorMaxCentavos: 100_000_000,
  taxaMaxPercentual: 99,
} as const;

/** Uma venda lançada à mão. Valores em centavos; a taxa fixa é o total da venda. */
export interface VendaControle {
  id: string;
  data: Date;
  quantidade: number;
  /** Para quem foi — nome ou qualquer texto. */
  cliente: string;
  canal: CanalControle;
  precoUnitarioCentavos: number;
  taxaPercentual: number;
  taxaFixaCentavos: number;
  /** Material extra enviado junto (sacola, fita, cartão…), total da venda. */
  extrasCentavos: number;
  baixarEstoque: boolean;
  /** Quanto de fato saiu do estoque do site — é o que volta se a venda for desfeita. */
  quantidadeBaixada: number;
}

export interface ControleVendas {
  _id?: ObjectId;
  produtoId: ObjectId;
  produzido: number;
  /** Custo de uma peça impressa — ausente = usa o custo de produção do produto. */
  custoUnitarioCentavos?: number;
  /** Preço de venda de referência — ausente = usa o preço do site. */
  precoVendaCentavos?: number;
  vendas: VendaControle[];
  criadoEm: Date;
  atualizadoEm: Date;
}

/** Corpo de criação/edição de uma venda. */
export interface VendaControlePayload {
  data: string;
  quantidade: number;
  cliente: string;
  canal: CanalControle;
  precoUnitarioCentavos: number;
  taxaPercentual: number;
  taxaFixaCentavos: number;
  extrasCentavos: number;
  baixarEstoque: boolean;
}

export interface ProducaoControlePayload {
  produzido: number;
  custoUnitarioCentavos: number | null;
  precoVendaCentavos: number | null;
}

export interface VendaControleJson extends Omit<VendaControle, "data"> {
  data: string;
}

/** Linha da tela: o produto com o controle dele (vazio quando nada foi lançado). */
export interface ItemControleJson {
  produtoId: string;
  nome: string;
  foto: string | null;
  estoque: number;
  /** Preço do site e custo do cadastro — usados quando o controle não tem os próprios. */
  precoSiteCentavos: number;
  custoCadastroCentavos: number | null;
  produzido: number;
  custoUnitarioCentavos: number | null;
  precoVendaCentavos: number | null;
  vendas: VendaControleJson[];
}
