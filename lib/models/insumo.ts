import type { ObjectId } from "mongodb";
import type { CategoriaDespesa } from "./financeiro";

/** Catálogo de insumos: o que foi comprado, quanto veio e quanto custa cada unidade. */
export const INSUMOS_COLLECTION = "insumos";

/** Categoria do insumo — as mesmas categorias de despesa que já entram no custo da peça. */
export type CategoriaInsumo = Extract<CategoriaDespesa, "filamento" | "embalagem" | "insumos">;

export const CATEGORIAS_INSUMO_CADASTRO: readonly CategoriaInsumo[] = ["filamento", "embalagem", "insumos"];

/** Medida em que o insumo é usado na peça — o custo sai sempre por uma dessas. */
export const UNIDADES_INSUMO = ["unidade", "grama", "ml", "metro"] as const;
export type UnidadeInsumo = (typeof UNIDADES_INSUMO)[number];

export const ROTULO_UNIDADE: Record<
  UnidadeInsumo,
  { opcao: string; quantidade: string; custo: string; sigla: string; dica: string }
> = {
  unidade: { opcao: "Unidade (peças, argolas…)", quantidade: "Quantas veio", custo: "por unidade", sigla: "un", dica: "Ex.: 100 argolas." },
  grama: { opcao: "Grama (filamento, cola…)", quantidade: "Quantos gramas veio", custo: "por grama", sigla: "g", dica: "1 kg = 1000 g." },
  ml: { opcao: "Mililitro (tinta, resina…)", quantidade: "Quantos ml veio", custo: "por ml", sigla: "ml", dica: "1 litro = 1000 ml." },
  metro: { opcao: "Metro (cordão, fita…)", quantidade: "Quantos metros veio", custo: "por metro", sigla: "m", dica: "Ex.: 50 m de cordão." },
};

export const LIMITES_INSUMO = {
  nomeMax: 120,
  marcaMax: 60,
  observacaoMax: 300,
  quantidadeMax: 10_000_000,
  valorMaxCentavos: 100_000_000,
} as const;

/**
 * Um insumo do catálogo. `quantidade` e `valorTotalCentavos` são sempre os da
 * última compra — recomprar sobrescreve o custo atual e lança uma despesa nova.
 */
export interface Insumo {
  _id?: ObjectId;
  nome: string;
  marca?: string;
  categoria: CategoriaInsumo;
  unidade: UnidadeInsumo;
  /** Quantidade da última compra, na unidade do insumo. */
  quantidade: number;
  /** Valor total pago na última compra, em centavos (com o frete da compra). */
  valorTotalCentavos: number;
  ultimaCompraEm: Date;
  /** Despesa gerada pela última compra — editar o insumo também corrige ela. */
  ultimaDespesaId?: string;
  observacao?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface InsumoPayload {
  nome: string;
  marca?: string;
  categoria: CategoriaInsumo;
  unidade: UnidadeInsumo;
  quantidade: number;
  valorTotalCentavos: number;
  /** `AAAA-MM-DD` — data da compra. */
  data: string;
  observacao?: string;
}

/** Nova compra do mesmo insumo: sobrescreve o custo atual e lança a despesa. */
export interface CompraInsumoPayload {
  quantidade: number;
  valorTotalCentavos: number;
  /** `AAAA-MM-DD` */
  data: string;
  observacao?: string;
}

export interface InsumoJson {
  id: string;
  nome: string;
  marca?: string;
  categoria: CategoriaInsumo;
  unidade: UnidadeInsumo;
  quantidade: number;
  valorTotalCentavos: number;
  /** `AAAA-MM-DD` */
  ultimaCompraEm: string;
  observacao?: string;
  /** Custo de uma unidade da medida, em centavos — pode ter fração de centavo. */
  custoUnitarioCentavos: number;
  /** Soma das compras já lançadas nas despesas. */
  totalGastoCentavos: number;
  /** Quantas compras deste insumo foram lançadas. */
  compras: number;
}
