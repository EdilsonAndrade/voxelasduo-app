import type { FichaTecnicaProduto } from "@/lib/models/produto";

/**
 * Valores do formulário de ficha técnica — todos em texto, convertidos ao
 * salvar (EDI-90). Vive fora de `ProdutoForm.tsx` (que é `"use client"`)
 * pelo mesmo motivo de `embalagemEnvioFormulario.ts`/`custoProducaoFormulario.ts`:
 * é usado tanto pelo formulário (client) quanto pela página de edição
 * (Server Component).
 *
 * Diferente de `EmbalagemEnvioFormValores`: cada campo aqui é
 * **individualmente** opcional — o vendedor pode preencher só um deles, sem
 * que isso invalide os demais (EDI-90, distinto de `embalagemEnvio`, onde os
 * 4 campos são exigidos em bloco).
 */
export interface FichaTecnicaFormValores {
  alturaCm: string;
  larguraCm: string;
  comprimentoCm: string;
  pesoGramas: string;
  material: string;
  /** Um item por linha — convertido para `string[]` ao salvar. */
  itensInclusos: string;
}

export const VAZIO_FICHA_TECNICA: FichaTecnicaFormValores = {
  alturaCm: "",
  larguraCm: "",
  comprimentoCm: "",
  pesoGramas: "",
  material: "",
  itensInclusos: "",
};

const CAMPOS_NUMERICOS: Array<{
  chave: keyof Pick<FichaTecnicaFormValores, "alturaCm" | "larguraCm" | "comprimentoCm" | "pesoGramas">;
  destino: keyof Pick<FichaTecnicaProduto, "alturaCm" | "larguraCm" | "comprimentoCm" | "pesoGramas">;
}> = [
  { chave: "alturaCm", destino: "alturaCm" },
  { chave: "larguraCm", destino: "larguraCm" },
  { chave: "comprimentoCm", destino: "comprimentoCm" },
  { chave: "pesoGramas", destino: "pesoGramas" },
];

function numeroDeTexto(valor: string): number {
  return Number(valor.trim().replace(",", "."));
}

function itensDeTexto(valor: string): string[] {
  return valor
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);
}

/** `true` quando ao menos um campo do formulário tem algo preenchido. */
export function camposFichaTecnicaPreenchidos(form: FichaTecnicaFormValores): boolean {
  return Boolean(montarFichaTecnica(form));
}

/**
 * Converte o formulário para `FichaTecnicaProduto` — inclui só os campos
 * válidos preenchidos (um campo numérico inválido/vazio é apenas omitido,
 * sem invalidar os demais, EDI-90). Retorna `undefined` quando nada foi
 * preenchido.
 */
export function montarFichaTecnica(form: FichaTecnicaFormValores): FichaTecnicaProduto | undefined {
  const ficha: FichaTecnicaProduto = {};

  for (const { chave, destino } of CAMPOS_NUMERICOS) {
    const bruto = form[chave].trim();
    if (bruto === "") continue;
    const numero = numeroDeTexto(bruto);
    if (Number.isFinite(numero) && numero > 0) {
      ficha[destino] = numero;
    }
  }

  const material = form.material.trim();
  if (material !== "") {
    ficha.material = material;
  }

  const itens = itensDeTexto(form.itensInclusos);
  if (itens.length > 0) {
    ficha.itensInclusos = itens;
  }

  return Object.keys(ficha).length > 0 ? ficha : undefined;
}

/** Converte uma `FichaTecnicaProduto` já salva de volta para o formulário em texto — usado ao editar um produto. */
export function fichaTecnicaParaFormulario(fichaTecnica?: FichaTecnicaProduto): FichaTecnicaFormValores {
  if (!fichaTecnica) return VAZIO_FICHA_TECNICA;

  return {
    alturaCm: fichaTecnica.alturaCm !== undefined ? String(fichaTecnica.alturaCm) : "",
    larguraCm: fichaTecnica.larguraCm !== undefined ? String(fichaTecnica.larguraCm) : "",
    comprimentoCm: fichaTecnica.comprimentoCm !== undefined ? String(fichaTecnica.comprimentoCm) : "",
    pesoGramas: fichaTecnica.pesoGramas !== undefined ? String(fichaTecnica.pesoGramas) : "",
    material: fichaTecnica.material ?? "",
    itensInclusos: fichaTecnica.itensInclusos?.join("\n") ?? "",
  };
}
