import type { ObjectId } from "mongodb";
import type { CustoProducaoFormValores } from "@/lib/produtos/custoProducaoFormulario";

export const CALCULOS_PRECO_COLLECTION = "calculosPreco";

export interface CanalCalculadoraValores {
  taxaPercentual: string;
  /** Shopee: taxa fixa por venda; Mercado Livre: custo fixo por unidade abaixo de R$ 79. */
  taxaFixaReais: string;
  /** Shopee: `false` = usa a taxa digitada em vez da tabela por faixa de preço (ausente = tabela). */
  taxaPorFaixa?: boolean;
  /** Shopee: conta CPF com mais de 450 pedidos em 90 dias — soma R$ 3 por item. */
  cpfAcima450Pedidos?: boolean;
  /** Legado: anúncio em % por canal, antes da meta de ROAS única. */
  anuncioPercentual?: string;
}

/** Como o anúncio é pago: fora, embutido no preço de venda, ou com verba do próprio bolso. */
export type ModoAnuncio = "sem" | "embutido" | "bolso";

export interface AnuncioCalculadoraValores {
  modo: ModoAnuncio;
  /** Meta de ROAS da campanha (ex: "8" = R$ 8 vendidos a cada R$ 1 de anúncio). */
  roasMeta: string;
  /** Verba do bolso por mês, usada no modo "bolso". */
  verbaMesReais: string;
}

/**
 * Tudo o que foi digitado na calculadora de preço, como texto — guardado assim
 * para reabrir o cálculo exatamente como estava, ainda antes de virar produto.
 */
export interface CalculadoraValores {
  custo: CustoProducaoFormValores;
  /** Altura da peça em cm — só informativa, para diferenciar tamanhos do mesmo produto (opcional). */
  alturaCm?: string;
  /** Legado: margem sobre o custo, antes do lucro em % do preço. */
  margemPercentual?: string;
  /** Lucro que precisa sobrar em cada venda, em % do preço — ausente em cálculos antigos = 25. */
  margemMinimaPrecoPercentual?: string;
  /** Ausente em cálculos antigos = sem anúncio, ROAS 8. */
  anuncio?: AnuncioCalculadoraValores;
  /** Preço do mesmo produto num concorrente, para comparar — opcional. */
  precoConcorrenteReais?: string;
  /** Preço do concorrente em oferta relâmpago, quando ele faz — opcional. */
  precoConcorrenteOfertaReais?: string;
  /** Quantas unidades o concorrente vendeu no mês (visto no anúncio dele) — opcional. */
  vendasConcorrenteMes?: string;
  canais: { shopee: CanalCalculadoraValores; mercadoLivre: CanalCalculadoraValores };
  producao: { pecasPorMesa: string; horasMesaCheia: string; horasPorDia: string; diasPorMes: string };
  pecasPorMes: string;
}

/** Cálculo de viabilidade salvo — um estudo de preço que ainda pode (ou não) virar produto. */
export interface CalculoPreco {
  _id?: ObjectId;
  nome: string;
  linkModelo3d?: string;
  /** Anúncio do mesmo produto visto na Shopee — referência de preço, opcional. */
  linkShopee?: string;
  /** Anúncio do mesmo produto visto no Mercado Livre — referência de preço, opcional. */
  linkMercadoLivre?: string;
  valores: CalculadoraValores;
  /** Produto rascunho criado a partir deste cálculo — ausente = ainda não virou produto. */
  produtoId?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
