import type { PrecosCanaisProduto } from "@/lib/models/produto";

/**
 * Preço de venda por canal no formulário (EDI-108) — texto; vazio = herda o
 * preço do site (`preco`). Mesmo padrão de `taxasCanaisFormulario.ts`.
 */
export interface PrecosCanaisFormValores {
  mercadoLivre: string;
  shopee: string;
}

export const VAZIO_PRECOS_CANAIS: PrecosCanaisFormValores = {
  mercadoLivre: "",
  shopee: "",
};

function numeroDeTexto(valor: string): number {
  return Number(valor.trim().replace(",", "."));
}

function precoValido(texto: string): boolean {
  const numero = numeroDeTexto(texto);
  return Number.isFinite(numero) && numero > 0;
}

/** Campos de preço preenchidos com valor inválido — usado para avisar antes de salvar. */
export function camposPrecosCanaisInvalidos(form: PrecosCanaisFormValores): string[] {
  const invalidos: string[] = [];
  if (form.mercadoLivre.trim() !== "" && !precoValido(form.mercadoLivre)) {
    invalidos.push("preço do Mercado Livre (maior que zero)");
  }
  if (form.shopee.trim() !== "" && !precoValido(form.shopee)) {
    invalidos.push("preço da Shopee (maior que zero)");
  }
  return invalidos;
}

/**
 * Converte o formulário para `PrecosCanaisProduto`. Sempre devolve um objeto
 * (vazio quando nada foi diferenciado) para que um PATCH consiga limpar
 * overrides antigos — `undefined` sumiria do JSON e manteria o valor salvo.
 */
export function montarPrecosCanaisProduto(form: PrecosCanaisFormValores): PrecosCanaisProduto {
  const precos: PrecosCanaisProduto = {};
  if (form.mercadoLivre.trim() !== "" && precoValido(form.mercadoLivre)) {
    precos.mercadoLivre = Math.round(numeroDeTexto(form.mercadoLivre) * 100);
  }
  if (form.shopee.trim() !== "" && precoValido(form.shopee)) {
    precos.shopee = Math.round(numeroDeTexto(form.shopee) * 100);
  }
  return precos;
}

export function precosCanaisParaFormulario(precos?: PrecosCanaisProduto): PrecosCanaisFormValores {
  if (!precos) return VAZIO_PRECOS_CANAIS;

  return {
    mercadoLivre: precos.mercadoLivre !== undefined ? (precos.mercadoLivre / 100).toFixed(2) : "",
    shopee: precos.shopee !== undefined ? (precos.shopee / 100).toFixed(2) : "",
  };
}
