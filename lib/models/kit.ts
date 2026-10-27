import type { ObjectId } from "mongodb";

export const KITS_COLLECTION = "kits";

/** Faixas de desconto sobre a soma dos preços avulsos usadas quando o kit não define as próprias. */
export const FAIXAS_DESCONTO_PADRAO = [10, 15, 20];

/** Máximo de itens distintos num kit. */
export const MAXIMO_ITENS_KIT = 30;

/** O que o kit precisa saber de um componente (lido do produto). */
export interface ValoresComponente {
  nome: string;
  /** Preço avulso no site, em centavos. */
  precoCentavos: number;
  /** Peso da peça, em gramas — `null` = não informado no produto. */
  pesoGramas: number | null;
  /** Tempo de impressão, em minutos — `null` = não informado. */
  tempoMinutos: number | null;
  /** Custo de produção sem a embalagem da peça (o kit tem uma só) — `null` = produto sem custo cadastrado. */
  custoCentavos: number | null;
}

export interface ItemKit {
  produtoId: string;
  /** Inteiro de 1 a 999. */
  quantidade: number;
  /** Últimos valores conhecidos — exibidos se o produto for apagado. */
  ultimo: ValoresComponente;
}

/** Valores do kit e de cada componente quando o preço do kit foi definido — base do aviso de desatualizado. */
export interface ReferenciaPreco {
  somaAvulsaCentavos: number;
  custoCentavos: number;
  pesoGramas: number;
  tempoMinutos: number;
  itens: Record<string, ValoresComponente & { quantidade: number }>;
  definidoEm: Date;
}

/**
 * Kit montado no admin (specs/037): produtos do catálogo com quantidade, uma
 * embalagem só para o conjunto e o preço escolhido, que deve ficar abaixo da
 * soma dos preços avulsos e acima do piso de lucro.
 */
export interface Kit {
  _id?: ObjectId;
  nome: string;
  itens: ItemKit[];
  /** Embalagem do kit inteiro, em centavos. */
  embalagemCentavos: number;
  /** Descontos (% sobre a soma avulsa) sugeridos na tela. */
  faixasDesconto: number[];
  /** `null` = ainda sem preço. */
  precoCentavos: number | null;
  /** Presente sempre que há preço. */
  referencia?: ReferenciaPreco;
  /** Produto gerado a partir do kit. */
  produtoId?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
