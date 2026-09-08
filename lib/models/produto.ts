import type { ObjectId } from "mongodb";

export const PRODUTOS_COLLECTION = "produtos";

/** IDs do anúncio correspondente em cada canal externo — ausência = produto sem anúncio naquele canal. */
export interface IntegracoesCanal {
  mercadoLivreId?: string;
  /** URL pública do anúncio, devolvida pela API na criação (`item.permalink`) — não reconstruir manualmente (ver anuncios.ts). */
  mercadoLivrePermalink?: string;
  shopeeItemId?: string;
}

/**
 * Custo de produção estimado (COGS) de uma peça impressa em 3D — específico
 * deste produto, não uma configuração global (EDI-92: cada produto pode ter
 * sua própria impressora/filamento/tarifas). Todos os valores monetários em
 * centavos, mesma convenção de `Produto.preco`.
 */
export interface CustoProducao {
  /** Peso da peça impressa, em gramas. */
  pesoPecaGramas: number;
  /** Tempo de impressão da peça, em horas. */
  tempoImpressaoHoras: number;
  /** Tempo de mão de obra/acabamento (preparo, limpeza, embalagem), em horas. */
  tempoMaoDeObraHoras: number;
  /** Preço pago pelo carretel de filamento, em centavos. */
  precoCarreteCentavos: number;
  /** Peso total do carretel de filamento, em gramas. */
  pesoCarreteGramas: number;
  /** Margem de perda/purga/testes, em percentual (ex: 10 = 10%). */
  margemPerdaPercentual: number;
  /** Preço de compra da impressora, em centavos. */
  precoImpressoraCentavos: number;
  /** Vida útil estimada da impressora, em horas. */
  vidaUtilImpressoraHoras: number;
  /** Consumo elétrico médio da impressora durante a impressão, em kWh. */
  consumoEletricoKwh: number;
  /** Tarifa de energia elétrica, em centavos por kWh. */
  tarifaEnergiaCentavos: number;
  /** Valor da hora de trabalho do operador, em centavos. */
  valorHoraTrabalhoCentavos: number;
  /** Custo de embalagem/envio por unidade, em centavos. */
  custoEmbalagemCentavos: number;
}

export interface Produto {
  _id?: ObjectId;
  nome: string;
  /** Identificador de URL, único dentro da categoria (/produtos/[categoria]/[slug]). */
  slug: string;
  descricao: string;
  /** Preço de venda em centavos, para evitar erros de ponto flutuante. */
  preco: number;
  fotos: string[];
  estoque: number;
  categoria: string;
  integracoes?: IntegracoesCanal;
  /** Custo de produção específico deste produto — ausente = ainda não configurado (EDI-92). */
  custoProducao?: CustoProducao;
  criadoEm: Date;
  atualizadoEm: Date;
}
