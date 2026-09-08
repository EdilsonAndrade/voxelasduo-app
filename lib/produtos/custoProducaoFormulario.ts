import type { CustoProducao } from "@/lib/models/produto";

/**
 * Valores do formulário de custo de produção — todos em texto
 * (reais/gramas/horas/%), convertidos ao salvar (EDI-92).
 *
 * Vive fora de `ProdutoForm.tsx` (que é `"use client"`) porque é usado tanto
 * pelo formulário (client) quanto pela página de edição (Server Component) —
 * uma função exportada de um módulo `"use client"` não pode ser chamada a
 * partir do servidor, mesmo sendo pura.
 */
export interface CustoProducaoFormValores {
  pesoPecaGramas: string;
  tempoImpressaoHoras: string;
  tempoMaoDeObraHoras: string;
  precoCarreteReais: string;
  pesoCarreteGramas: string;
  margemPerdaPercentual: string;
  precoImpressoraReais: string;
  vidaUtilImpressoraHoras: string;
  consumoEletricoKwh: string;
  tarifaEnergiaReais: string;
  valorHoraTrabalhoReais: string;
  custoEmbalagemReais: string;
}

/**
 * Padrão para produto novo: valores fixos do parque de impressoras/insumos
 * atual do solicitante (impressora, filamento, energia, mão de obra,
 * embalagem) — só peso da peça e tempo de impressão ficam em branco, por
 * variarem a cada peça impressa.
 */
export const VAZIO_CUSTO_PRODUCAO: CustoProducaoFormValores = {
  pesoPecaGramas: "",
  tempoImpressaoHoras: "",
  tempoMaoDeObraHoras: "1",
  precoCarreteReais: "100.00",
  pesoCarreteGramas: "1000",
  margemPerdaPercentual: "",
  precoImpressoraReais: "4570.00",
  vidaUtilImpressoraHoras: "4000",
  consumoEletricoKwh: "0.15",
  tarifaEnergiaReais: "0.90",
  valorHoraTrabalhoReais: "1.00",
  custoEmbalagemReais: "5.00",
};

/** Campos de custo de produção, na ordem exibida no formulário — `permiteZero` só vale para margem de perda. */
export const CAMPOS_CUSTO_PRODUCAO: Array<{
  chave: keyof CustoProducaoFormValores;
  label: string;
  permiteZero?: boolean;
}> = [
  { chave: "pesoPecaGramas", label: "peso da peça" },
  { chave: "tempoImpressaoHoras", label: "tempo de impressão" },
  { chave: "tempoMaoDeObraHoras", label: "tempo de mão de obra" },
  { chave: "precoCarreteReais", label: "preço do carretel de filamento" },
  { chave: "pesoCarreteGramas", label: "peso do carretel" },
  { chave: "margemPerdaPercentual", label: "margem de perda", permiteZero: true },
  { chave: "precoImpressoraReais", label: "preço da impressora" },
  { chave: "vidaUtilImpressoraHoras", label: "vida útil da impressora" },
  { chave: "consumoEletricoKwh", label: "consumo elétrico" },
  { chave: "tarifaEnergiaReais", label: "tarifa de energia" },
  { chave: "valorHoraTrabalhoReais", label: "valor da hora de trabalho" },
  { chave: "custoEmbalagemReais", label: "custo de embalagem" },
];

function numeroDeTexto(valor: string): number {
  return Number(valor.trim().replace(",", "."));
}

/** Campos de custo de produção ainda não preenchidos (ou inválidos) — usado para não calcular um COGS incompleto/enganoso (FR-011). */
export function camposCustoProducaoFaltando(form: CustoProducaoFormValores): string[] {
  const faltando: string[] = [];
  for (const { chave, label, permiteZero } of CAMPOS_CUSTO_PRODUCAO) {
    const bruto = form[chave].trim();
    if (bruto === "") {
      faltando.push(label);
      continue;
    }
    const numero = numeroDeTexto(bruto);
    if (!Number.isFinite(numero) || (permiteZero ? numero < 0 : numero <= 0)) {
      faltando.push(label);
    }
  }
  return faltando;
}

/** Converte o formulário de custo de produção para `CustoProducao` (centavos) — retorna `null` se algum campo estiver faltando/inválido. */
export function montarCustoProducao(form: CustoProducaoFormValores): CustoProducao | null {
  if (camposCustoProducaoFaltando(form).length > 0) return null;

  const centavos = (texto: string) => Math.round(numeroDeTexto(texto) * 100);

  return {
    pesoPecaGramas: numeroDeTexto(form.pesoPecaGramas),
    tempoImpressaoHoras: numeroDeTexto(form.tempoImpressaoHoras),
    tempoMaoDeObraHoras: numeroDeTexto(form.tempoMaoDeObraHoras),
    precoCarreteCentavos: centavos(form.precoCarreteReais),
    pesoCarreteGramas: numeroDeTexto(form.pesoCarreteGramas),
    margemPerdaPercentual: numeroDeTexto(form.margemPerdaPercentual),
    precoImpressoraCentavos: centavos(form.precoImpressoraReais),
    vidaUtilImpressoraHoras: numeroDeTexto(form.vidaUtilImpressoraHoras),
    consumoEletricoKwh: numeroDeTexto(form.consumoEletricoKwh),
    tarifaEnergiaCentavos: centavos(form.tarifaEnergiaReais),
    valorHoraTrabalhoCentavos: centavos(form.valorHoraTrabalhoReais),
    custoEmbalagemCentavos: centavos(form.custoEmbalagemReais),
  };
}

/** Converte um `CustoProducao` já salvo (centavos) de volta para o formulário em texto — usado ao editar um produto. */
export function custoProducaoParaFormulario(custo?: CustoProducao): CustoProducaoFormValores {
  if (!custo) return VAZIO_CUSTO_PRODUCAO;

  const reais = (centavos: number) => (centavos / 100).toFixed(2);

  return {
    pesoPecaGramas: String(custo.pesoPecaGramas),
    tempoImpressaoHoras: String(custo.tempoImpressaoHoras),
    tempoMaoDeObraHoras: String(custo.tempoMaoDeObraHoras),
    precoCarreteReais: reais(custo.precoCarreteCentavos),
    pesoCarreteGramas: String(custo.pesoCarreteGramas),
    margemPerdaPercentual: String(custo.margemPerdaPercentual),
    precoImpressoraReais: reais(custo.precoImpressoraCentavos),
    vidaUtilImpressoraHoras: String(custo.vidaUtilImpressoraHoras),
    consumoEletricoKwh: String(custo.consumoEletricoKwh),
    tarifaEnergiaReais: reais(custo.tarifaEnergiaCentavos),
    valorHoraTrabalhoReais: reais(custo.valorHoraTrabalhoCentavos),
    custoEmbalagemReais: reais(custo.custoEmbalagemCentavos),
  };
}
