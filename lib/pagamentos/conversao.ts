/**
 * Única fronteira de conversão de unidade monetária: o projeto guarda valores
 * em centavos (inteiro) desde a Tarefa 1, mas a API do Mercado Pago espera
 * `transaction_amount` em reais (número decimal, ex: 49.9).
 */

export function centavosParaReais(centavos: number): number {
  return Math.round(centavos) / 100;
}

export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}
