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
  /** Shopee: tipo de conta — o adicional de R$ 3 por item só vale para CPF (ausente = CPF). */
  tipoConta?: "cnpj" | "cpf";
  /** Shopee: participa de campanha de destaque (comissão extra durante a campanha). */
  campanhaDestaque?: boolean;
  /** Shopee: comissão extra da campanha de destaque, em %. */
  campanhaPercentual?: string;
  /** Shopee: cupom de desconto próprio, bancado pelo vendedor (custo por pedido). */
  cupomAtivo?: boolean;
  cupomReais?: string;
}

/** Filamento usado na mesa (peso da mesa inteira). */
export interface FilamentoCalculadora {
  nome: string;
  cor: string;
  pesoGramas: string;
  precoKgReais: string;
}

export type CategoriaExtra = "embalagem" | "acabamento" | "maoDeObra" | "outros";

/** Custo extra por unidade vendida (embalagem, acabamento, mão de obra…). */
export interface ExtraCalculadora {
  item: string;
  quantidade: string;
  precoReais: string;
  categoria: CategoriaExtra;
}

export type ImpressoraReferencia = "a1mini" | "a1" | "p1s" | "x1c" | "outra";

/**
 * Dados de impressão da MESA inteira (como o G-code informa) — o custo por
 * unidade divide material, energia e desgaste pelas peças por mesa.
 */
export interface ImpressaoCalculadora {
  impressora: ImpressoraReferencia;
  consumoKwh: string;
  tarifaEnergiaReais: string;
  precoImpressoraReais: string;
  vidaUtilHoras: string;
  pecasPorMesa: string;
  tempoHoras: string;
  tempoMinutos: string;
  perdaPercentual: string;
  taxaFalhaPercentual: string;
  /** Campo simples — só vale com `filamentos` vazio. */
  pesoGramas: string;
  precoKgReais: string;
  filamentos: FilamentoCalculadora[];
  /** Campo simples — só vale com `extras` vazio. */
  embalagemReais: string;
  extras: ExtraCalculadora[];
}

export type ModoPrecificacao = "margem" | "alvo";

export interface PrecificacaoCalculadora {
  modo: ModoPrecificacao;
  /** Preço que o comprador paga, digitado no modo "alvo" (vale para todos os canais). */
  precoAlvoReais: string;
  impostoPercentual: string;
  promocaoAtiva: boolean;
  promocaoPercentual: string;
}

export type FormaPagamento = "debito" | "credito" | "pix" | "outra";

export interface VendaDiretaCalculadora {
  pagamento: FormaPagamento;
  taxaPixPercentual: string;
  taxaOutraPercentual: string;
  /** "gratis" = o vendedor absorve o custo de envio. */
  frete: "gratis" | "cobrado";
  custoEnvioReais: string;
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
  /** Ausente = formato antigo (custo por peça em `custo`); 2 = `impressao` + `precificacao` + `vendaDireta`. */
  versao?: 2;
  impressao?: ImpressaoCalculadora;
  precificacao?: PrecificacaoCalculadora;
  vendaDireta?: VendaDiretaCalculadora;
  /** Legado (v1): custo por peça no formato do produto — só lido para converter. */
  custo?: CustoProducaoFormValores;
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
  /** v2: peças por mesa e tempo da mesa vêm de `impressao`; os dois primeiros ficam só nos cálculos antigos. */
  producao: { pecasPorMesa?: string; horasMesaCheia?: string; horasPorDia: string; diasPorMes: string };
  pecasPorMes: string;
}

/** Cálculo de viabilidade salvo — um estudo de preço que ainda pode (ou não) virar produto. */
/** Valores já convertidos para a versão 2 — o que a calculadora e o orçamento usam. */
export type CalculadoraValoresV2 = CalculadoraValores & {
  versao: 2;
  impressao: ImpressaoCalculadora;
  precificacao: PrecificacaoCalculadora;
  vendaDireta: VendaDiretaCalculadora;
};

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
