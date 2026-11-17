/** Formas de entrega do checkout do site (spec 039). */
/** `retirada` (retirar em mãos) só existe no link de pagamento — fora das opções do checkout do site. */
export type ServicoFrete = "pac" | "sedex" | "combinar" | "retirada";

/** Ordem de exibição no checkout. */
export const SERVICOS_FRETE: ServicoFrete[] = ["pac", "sedex", "combinar"];

/** Retirada em mãos: sem endereço e sem custo (link de pagamento). */
export const SERVICO_RETIRADA = "retirada" satisfies ServicoFrete;

/** Rótulos pt-BR das formas de entrega — centralizados para tradução futura. */
export const ROTULO_SERVICO_FRETE: Record<ServicoFrete, string> = {
  pac: "PAC",
  sedex: "SEDEX",
  combinar: "Combinar com a loja",
  retirada: "Retirar em mãos",
};

/** De onde veio o valor: fixo configurado, calculado por CEP/peso ou gratuito (combinar). */
export type OrigemFrete = "fixo" | "calculado" | "gratis";

/** `_id` fixo do documento de frete na coleção `configuracoes`. */
export const FRETE_CONFIG_ID = "frete";

/** Valores fixos do frete por pedido, em centavos. */
export interface FreteConfig {
  pacCentavos: number;
  sedexCentavos: number;
}

export interface FreteConfigDocumento extends FreteConfig {
  _id: typeof FRETE_CONFIG_ID;
  atualizadoEm: Date;
}

/** Usados enquanto o lojista ainda não salvou a própria configuração. */
export const FRETE_PADRAO: FreteConfig = {
  pacCentavos: 1990,
  sedexCentavos: 2550,
};

/** Opção exibida no checkout — não persistida. */
export interface OpcaoFrete {
  servico: ServicoFrete;
  rotulo: string;
  valorCentavos: number;
  origem: OrigemFrete;
}

/** Frete gravado no pedido no momento da criação (`Pedido.frete`). */
export interface FretePedido {
  servico: ServicoFrete;
  valorCentavos: number;
  origem: OrigemFrete;
}
