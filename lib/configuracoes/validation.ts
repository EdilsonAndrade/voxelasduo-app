import type { TaxasCanaisConfig } from "@/lib/models/configuracao";

export type ErrosTaxasCanais = Partial<Record<keyof TaxasCanaisConfig, string>>;

function numeroFinito(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

/** Valida o payload do padrão global de taxas (EDI-106): taxas e margens 0 ≤ x < 100, taxa fixa ≥ 0, cupom de loja (teto `null` = sem limite), todos obrigatórios. */
export function validarTaxasCanais(payload: unknown): ErrosTaxasCanais {
  const erros: ErrosTaxasCanais = {};
  const dados = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;

  for (const campo of ["shopeeTaxaPercentual", "siteTaxaPercentual"] as const) {
    const valor = dados[campo];
    if (!numeroFinito(valor) || valor < 0 || valor >= 100) {
      erros[campo] = "Informe um percentual entre 0 e menos de 100.";
    }
  }

  const fixa = dados.siteTaxaFixaCentavos;
  if (!numeroFinito(fixa) || fixa < 0) {
    erros.siteTaxaFixaCentavos = "A taxa fixa não pode ser negativa.";
  }

  // Margens são % do preço de venda (lucro ÷ preço) — sempre menores que 100%.
  for (const campo of ["margemMinimaPercentual", "margemDesejadaPercentual"] as const) {
    const valor = dados[campo];
    if (!numeroFinito(valor) || valor < 0 || valor >= 100) {
      erros[campo] = "A margem é sobre o preço de venda: informe um percentual entre 0 e menos de 100.";
    }
  }

  const cupom = dados.cupomLojaPercentual;
  if (!numeroFinito(cupom) || cupom < 0 || cupom >= 100) {
    erros.cupomLojaPercentual = "Informe um percentual entre 0 e menos de 100.";
  }

  const teto = dados.cupomLojaTetoCentavos;
  if (teto !== null && (!numeroFinito(teto) || teto < 0)) {
    erros.cupomLojaTetoCentavos = "O desconto máximo não pode ser negativo (deixe sem limite para não ter teto).";
  }

  const cesta = dados.cupomLojaCestaMinimaCentavos;
  if (!numeroFinito(cesta) || cesta < 0) {
    erros.cupomLojaCestaMinimaCentavos = "O valor mínimo da cesta não pode ser negativo.";
  }

  return erros;
}
