import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import type { TaxasCanaisProduto } from "@/lib/models/produto";

/**
 * Override das taxas por produto no formulário (EDI-106) — texto; vazio =
 * herda o padrão global. Vive fora de `ProdutoForm.tsx` (client) para poder
 * ser usado também pelas páginas (Server Components).
 */
export interface TaxasCanaisFormValores {
  shopeeTaxaPercentual: string;
  siteTaxaPercentual: string;
  siteTaxaFixaReais: string;
  /** Override da margem mínima só deste produto (EDI-108) — vazio = herda o padrão global. */
  margemMinimaPercentual: string;
  /** Override da margem desejada só deste produto (EDI-108, correção) — vazio = herda o padrão global. */
  margemDesejadaPercentual: string;
}

export const VAZIO_TAXAS_CANAIS: TaxasCanaisFormValores = {
  shopeeTaxaPercentual: "",
  siteTaxaPercentual: "",
  siteTaxaFixaReais: "",
  margemMinimaPercentual: "",
  margemDesejadaPercentual: "",
};

function numeroDeTexto(valor: string): number {
  return Number(valor.trim().replace(",", "."));
}

function percentualValido(texto: string): boolean {
  const numero = numeroDeTexto(texto);
  return Number.isFinite(numero) && numero >= 0 && numero < 100;
}

/** Margem desejada é sobre o custo, não sobre o preço — sem teto de 100% (200%, 300% etc. são válidos). */
function percentualSemTetoValido(texto: string): boolean {
  const numero = numeroDeTexto(texto);
  return Number.isFinite(numero) && numero >= 0;
}

/** Campos de taxa preenchidos com valor inválido — usado para avisar antes de salvar. */
export function camposTaxasCanaisInvalidos(form: TaxasCanaisFormValores): string[] {
  const invalidos: string[] = [];
  if (form.shopeeTaxaPercentual.trim() !== "" && !percentualValido(form.shopeeTaxaPercentual)) {
    invalidos.push("taxa da Shopee (entre 0 e 99,9%)");
  }
  if (form.siteTaxaPercentual.trim() !== "" && !percentualValido(form.siteTaxaPercentual)) {
    invalidos.push("taxa do site próprio (entre 0 e 99,9%)");
  }
  if (form.siteTaxaFixaReais.trim() !== "") {
    const fixa = numeroDeTexto(form.siteTaxaFixaReais);
    if (!Number.isFinite(fixa) || fixa < 0) invalidos.push("taxa fixa do site próprio");
  }
  if (
    form.margemMinimaPercentual.trim() !== "" &&
    !percentualValido(form.margemMinimaPercentual)
  ) {
    invalidos.push("margem mínima (entre 0 e 99,9%)");
  }
  if (
    form.margemDesejadaPercentual.trim() !== "" &&
    !percentualSemTetoValido(form.margemDesejadaPercentual)
  ) {
    invalidos.push("margem desejada (maior ou igual a 0)");
  }
  return invalidos;
}

/**
 * Converte o override do formulário para `TaxasCanaisProduto`. Sempre devolve
 * um objeto (vazio quando nada foi sobrescrito) para que um PATCH consiga
 * limpar overrides antigos — `undefined` sumiria do JSON e manteria o valor salvo.
 */
export function montarTaxasCanaisProduto(form: TaxasCanaisFormValores): TaxasCanaisProduto {
  const taxas: TaxasCanaisProduto = {};
  if (form.shopeeTaxaPercentual.trim() !== "" && percentualValido(form.shopeeTaxaPercentual)) {
    taxas.shopeeTaxaPercentual = numeroDeTexto(form.shopeeTaxaPercentual);
  }
  if (form.siteTaxaPercentual.trim() !== "" && percentualValido(form.siteTaxaPercentual)) {
    taxas.siteTaxaPercentual = numeroDeTexto(form.siteTaxaPercentual);
  }
  if (form.siteTaxaFixaReais.trim() !== "") {
    const fixa = numeroDeTexto(form.siteTaxaFixaReais);
    if (Number.isFinite(fixa) && fixa >= 0) taxas.siteTaxaFixaCentavos = Math.round(fixa * 100);
  }
  if (
    form.margemMinimaPercentual.trim() !== "" &&
    percentualValido(form.margemMinimaPercentual)
  ) {
    taxas.margemMinimaPercentual = numeroDeTexto(form.margemMinimaPercentual);
  }
  if (
    form.margemDesejadaPercentual.trim() !== "" &&
    percentualSemTetoValido(form.margemDesejadaPercentual)
  ) {
    taxas.margemDesejadaPercentual = numeroDeTexto(form.margemDesejadaPercentual);
  }
  return taxas;
}

export function taxasCanaisParaFormulario(taxas?: TaxasCanaisProduto): TaxasCanaisFormValores {
  if (!taxas) return VAZIO_TAXAS_CANAIS;

  return {
    shopeeTaxaPercentual:
      taxas.shopeeTaxaPercentual !== undefined ? String(taxas.shopeeTaxaPercentual) : "",
    siteTaxaPercentual:
      taxas.siteTaxaPercentual !== undefined ? String(taxas.siteTaxaPercentual) : "",
    siteTaxaFixaReais:
      taxas.siteTaxaFixaCentavos !== undefined ? (taxas.siteTaxaFixaCentavos / 100).toFixed(2) : "",
    margemMinimaPercentual:
      taxas.margemMinimaPercentual !== undefined ? String(taxas.margemMinimaPercentual) : "",
    margemDesejadaPercentual:
      taxas.margemDesejadaPercentual !== undefined ? String(taxas.margemDesejadaPercentual) : "",
  };
}

/** Formata o padrão global para exibir como placeholder dos campos de override. */
export function taxasGlobaisParaPlaceholder(global: TaxasCanaisConfig): TaxasCanaisFormValores {
  return {
    shopeeTaxaPercentual: String(global.shopeeTaxaPercentual),
    siteTaxaPercentual: String(global.siteTaxaPercentual),
    siteTaxaFixaReais: (global.siteTaxaFixaCentavos / 100).toFixed(2),
    margemMinimaPercentual: String(global.margemMinimaPercentual),
    margemDesejadaPercentual: String(global.margemDesejadaPercentual),
  };
}
