import type { TaxasCanaisConfig } from "@/lib/models/configuracao";

export type ErrosTaxasCanais = Partial<Record<keyof TaxasCanaisConfig, string>>;

function numeroFinito(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

/** Valida o payload do padrão global de taxas (EDI-106): percentuais 0 ≤ x < 100, taxa fixa ≥ 0, todos obrigatórios. */
export function validarTaxasCanais(payload: unknown): ErrosTaxasCanais {
  const erros: ErrosTaxasCanais = {};
  const dados = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;

  for (const campo of ["shopeeTaxaPercentual", "siteTaxaPercentual", "margemMinimaPercentual"] as const) {
    const valor = dados[campo];
    if (!numeroFinito(valor) || valor < 0 || valor >= 100) {
      erros[campo] = "Informe um percentual entre 0 e menos de 100.";
    }
  }

  const fixa = dados.siteTaxaFixaCentavos;
  if (!numeroFinito(fixa) || fixa < 0) {
    erros.siteTaxaFixaCentavos = "A taxa fixa não pode ser negativa.";
  }

  // Margem desejada é sobre o custo, não sobre o preço — sem teto de 100% (200%, 300% etc. são válidos).
  const margemDesejada = dados.margemDesejadaPercentual;
  if (!numeroFinito(margemDesejada) || margemDesejada < 0) {
    erros.margemDesejadaPercentual = "Informe um percentual válido, maior ou igual a 0.";
  }

  return erros;
}
