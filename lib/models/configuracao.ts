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
  /** Margem de lucro mínima aceitável, em percentual — piso de segurança pra promoções (EDI-108). */
  margemMinimaPercentual: number;
  /** Margem de lucro desejada, em percentual sobre o custo — usada pro "preço sugerido" do simulador. Sem teto (100 = dobrar o custo, 200 = triplicar, etc.), diferente da margem mínima (EDI-108, correção: antes não era salva). */
  margemDesejadaPercentual: number;
}

/** Documento persistido — `_id` fixo, um único por loja. */
export interface TaxasCanaisDocumento extends TaxasCanaisConfig {
  _id: typeof TAXAS_CANAIS_ID;
  atualizadoEm: Date;
}

/** Valores usados enquanto o vendedor ainda não salvou a própria configuração. */
export const TAXAS_CANAIS_PADRAO: TaxasCanaisConfig = {
  shopeeTaxaPercentual: 14,
  siteTaxaPercentual: 4.99,
  siteTaxaFixaCentavos: 0,
  margemMinimaPercentual: 15,
  margemDesejadaPercentual: 100,
};
