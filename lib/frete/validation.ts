import type { FreteConfig } from "@/lib/models/frete";

export type ErrosConfigFrete = Partial<Record<keyof FreteConfig, string>>;

/** Valida os valores fixos de PAC e SEDEX (spec 039): centavos inteiros ≥ 0, obrigatórios. */
export function validarConfigFrete(payload: unknown): ErrosConfigFrete {
  const erros: ErrosConfigFrete = {};
  const dados = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;

  for (const campo of ["pacCentavos", "sedexCentavos"] as const) {
    const valor = dados[campo];
    if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 0) {
      erros[campo] = "Informe um valor de frete válido (R$ 0,00 ou mais).";
    }
  }

  return erros;
}
