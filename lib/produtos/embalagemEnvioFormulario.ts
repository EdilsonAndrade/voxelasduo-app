import type { EmbalagemEnvio } from "@/lib/models/produto";

/**
 * Valores do formulário de embalagem para envio — todos em texto
 * (gramas/centímetros), convertidos ao salvar (EDI-96).
 *
 * Vive fora de `ProdutoForm.tsx` (que é `"use client"`) pelo mesmo motivo de
 * `custoProducaoFormulario.ts` (EDI-92): é usado tanto pelo formulário
 * (client) quanto pela página de edição (Server Component).
 */
export interface EmbalagemEnvioFormValores {
  pesoGramas: string;
  alturaCm: string;
  larguraCm: string;
  comprimentoCm: string;
}

export const VAZIO_EMBALAGEM_ENVIO: EmbalagemEnvioFormValores = {
  pesoGramas: "",
  alturaCm: "",
  larguraCm: "",
  comprimentoCm: "",
};

const CAMPOS_EMBALAGEM_ENVIO: Array<{ chave: keyof EmbalagemEnvioFormValores; label: string }> = [
  { chave: "pesoGramas", label: "peso da embalagem" },
  { chave: "alturaCm", label: "altura da embalagem" },
  { chave: "larguraCm", label: "largura da embalagem" },
  { chave: "comprimentoCm", label: "comprimento da embalagem" },
];

function numeroDeTexto(valor: string): number {
  return Number(valor.trim().replace(",", "."));
}

/** Campos de embalagem ainda não preenchidos (ou inválidos) — a publicação segue possível sem eles (FR-007), só avisa. */
export function camposEmbalagemFaltando(form: EmbalagemEnvioFormValores): string[] {
  const faltando: string[] = [];
  for (const { chave, label } of CAMPOS_EMBALAGEM_ENVIO) {
    const bruto = form[chave].trim();
    if (bruto === "") {
      faltando.push(label);
      continue;
    }
    const numero = numeroDeTexto(bruto);
    if (!Number.isFinite(numero) || numero <= 0) {
      faltando.push(label);
    }
  }
  return faltando;
}

/** Converte o formulário para `EmbalagemEnvio` — retorna `null` se algum campo estiver faltando/inválido. */
export function montarEmbalagemEnvio(form: EmbalagemEnvioFormValores): EmbalagemEnvio | null {
  if (camposEmbalagemFaltando(form).length > 0) return null;

  return {
    pesoGramas: numeroDeTexto(form.pesoGramas),
    alturaCm: numeroDeTexto(form.alturaCm),
    larguraCm: numeroDeTexto(form.larguraCm),
    comprimentoCm: numeroDeTexto(form.comprimentoCm),
  };
}

/** Converte um `EmbalagemEnvio` já salvo de volta para o formulário em texto — usado ao editar um produto. */
export function embalagemEnvioParaFormulario(embalagem?: EmbalagemEnvio): EmbalagemEnvioFormValores {
  if (!embalagem) return VAZIO_EMBALAGEM_ENVIO;

  return {
    pesoGramas: String(embalagem.pesoGramas),
    alturaCm: String(embalagem.alturaCm),
    larguraCm: String(embalagem.larguraCm),
    comprimentoCm: String(embalagem.comprimentoCm),
  };
}
