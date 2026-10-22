export const CONFIGURACOES_COLLECTION = "configuracoes";

/** `_id` fixo do documento único de taxas dos canais de venda (EDI-106). */
export const TAXAS_CANAIS_ID = "taxasCanais";

/**
 * Padrão global das taxas dos canais sem consulta automática (EDI-106):
 * Shopee (estimativa) e site próprio (meio de pagamento). Cada produto pode
 * sobrescrever qualquer campo via `Produto.taxasCanais`. Percentuais em número
 * (14 = 14%), taxa fixa em centavos.
 */
export interface TaxasCanaisConfig {
  shopeeTaxaPercentual: number;
  siteTaxaPercentual: number;
  siteTaxaFixaCentavos: number;
  /** Piso de lucro, em % do preço de venda (lucro ÷ preço) — abaixo dele não vale dar desconto (EDI-108, régua do preço). */
  margemMinimaPercentual: number;
  /** Margem de lucro desejada, em % do preço de venda — usada pro "preço sugerido". Menor que 100. */
  margemDesejadaPercentual: number;
  /** Cupom de loja da Shopee (vale para todos os produtos), em % — 0 = sem cupom. */
  cupomLojaPercentual: number;
  /** Desconto máximo do cupom de loja, em centavos — `null` = sem limite. */
  cupomLojaTetoCentavos: number | null;
  /** Valor mínimo da cesta do cupom de loja, em centavos — só informativo, não entra na conta. */
  cupomLojaCestaMinimaCentavos: number;
}

/** Documento persistido — `_id` fixo, um único por loja. */
export interface TaxasCanaisDocumento extends TaxasCanaisConfig {
  _id: typeof TAXAS_CANAIS_ID;
  atualizadoEm: Date;
  /** Ausente = margens antigas, em % sobre o custo — dispara a migração (`migrarMargensParaPreco`). */
  reguaMargem?: "preco";
}

/** Valores usados enquanto o vendedor ainda não salvou a própria configuração. */
export const TAXAS_CANAIS_PADRAO: TaxasCanaisConfig = {
  shopeeTaxaPercentual: 14,
  siteTaxaPercentual: 4.99,
  siteTaxaFixaCentavos: 0,
  margemMinimaPercentual: 25,
  margemDesejadaPercentual: 40,
  cupomLojaPercentual: 0,
  cupomLojaTetoCentavos: null,
  cupomLojaCestaMinimaCentavos: 0,
};
