import type { CategoriaExtra, ImpressaoCalculadora } from "@/lib/models/calculoPreco";
import type { CustoProducao } from "@/lib/models/produto";
import { horasDaMesa } from "./calculadoraValores";

/** Custo de UMA unidade vendida, por categoria, em centavos (cada parte arredondada; total = soma). */
export interface CustoUnidade {
  materialCentavos: number;
  energiaCentavos: number;
  desgasteCentavos: number;
  falhaCentavos: number;
  embalagemCentavos: number;
  acabamentoCentavos: number;
  maoDeObraCentavos: number;
  outrosCentavos: number;
  totalCentavos: number;
  /** Dados da mesa usados na conta. */
  pecasPorMesa: number;
  horasMesa: number;
  pesoMesaGramas: number;
}

export const ROTULO_CATEGORIA: Record<CategoriaExtra, string> = {
  embalagem: "Embalagem",
  acabamento: "Acabamento",
  maoDeObra: "Mão de obra",
  outros: "Outros",
};

function numero(texto: string | undefined): number {
  return Number((texto ?? "").trim().replace(",", "."));
}

/** Vazio = 0; número inválido ou negativo = NaN (campo com erro). */
function opcional(texto: string | undefined): number {
  if ((texto ?? "").trim() === "") return 0;
  const n = numero(texto);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/** O que falta (ou está inválido) para calcular o custo — vazio = dá para calcular. */
export function camposFaltandoCusto(impressao: ImpressaoCalculadora): string[] {
  const faltando: string[] = [];
  if (horasDaMesa(impressao) === null) faltando.push("tempo de impressão");
  if (!(Math.floor(numero(impressao.pecasPorMesa)) >= 1)) faltando.push("peças por mesa");

  if (impressao.filamentos.length > 0) {
    impressao.filamentos.forEach((f, i) => {
      if (!(numero(f.pesoGramas) > 0)) faltando.push(`peso do filamento ${i + 1}`);
      if (!(numero(f.precoKgReais) > 0)) faltando.push(`R$/kg do filamento ${i + 1}`);
    });
  } else {
    if (!(numero(impressao.pesoGramas) > 0)) faltando.push("peso do filamento");
    if (!(numero(impressao.precoKgReais) > 0)) faltando.push("preço do filamento");
  }

  if (!(numero(impressao.consumoKwh) > 0)) faltando.push("consumo da impressora");
  if (Number.isNaN(opcional(impressao.tarifaEnergiaReais))) faltando.push("preço da energia");
  const precoImpressora = opcional(impressao.precoImpressoraReais);
  if (Number.isNaN(precoImpressora)) faltando.push("preço da impressora");
  else if (precoImpressora > 0 && !(numero(impressao.vidaUtilHoras) > 0)) faltando.push("vida útil da impressora");

  for (const [campo, rotulo] of [
    ["perdaPercentual", "perda"],
    ["taxaFalhaPercentual", "taxa de falha"],
  ] as const) {
    const n = opcional(impressao[campo]);
    if (Number.isNaN(n) || n >= 100) faltando.push(`${rotulo} (entre 0 e 99,9%)`);
  }

  if (impressao.extras.length > 0) {
    impressao.extras.forEach((e, i) => {
      if (Number.isNaN(opcional(e.quantidade)) || Number.isNaN(opcional(e.precoReais))) {
        faltando.push(`custo extra ${i + 1}${e.item.trim() ? ` (${e.item.trim()})` : ""}`);
      }
    });
  } else if (Number.isNaN(opcional(impressao.embalagemReais))) {
    faltando.push("embalagem");
  }
  return faltando;
}

/** Soma dos extras por categoria, em centavos — lista vazia = só o campo simples de embalagem. */
function extrasPorCategoria(impressao: ImpressaoCalculadora): Record<CategoriaExtra, number> {
  const soma: Record<CategoriaExtra, number> = { embalagem: 0, acabamento: 0, maoDeObra: 0, outros: 0 };
  if (impressao.extras.length === 0) {
    soma.embalagem = Math.round(opcional(impressao.embalagemReais) * 100);
    return soma;
  }
  for (const e of impressao.extras) {
    const quantidade = e.quantidade.trim() === "" ? 1 : opcional(e.quantidade);
    soma[e.categoria] += quantidade * opcional(e.precoReais) * 100;
  }
  return {
    embalagem: Math.round(soma.embalagem),
    acabamento: Math.round(soma.acabamento),
    maoDeObra: Math.round(soma.maoDeObra),
    outros: Math.round(soma.outros),
  };
}

/**
 * Custo de uma unidade: material, energia e desgaste da MESA divididos pelas
 * peças da mesa; reserva de falha sobre esses três; extras já são por unidade.
 * `null` quando falta algum dado (ver `camposFaltandoCusto`).
 */
export function calcularCustoUnidade(impressao: ImpressaoCalculadora): CustoUnidade | null {
  if (camposFaltandoCusto(impressao).length > 0) return null;

  const pecas = Math.floor(numero(impressao.pecasPorMesa));
  const horas = horasDaMesa(impressao)!;
  const filamentos =
    impressao.filamentos.length > 0
      ? impressao.filamentos.map((f) => ({ g: numero(f.pesoGramas), kg: numero(f.precoKgReais) }))
      : [{ g: numero(impressao.pesoGramas), kg: numero(impressao.precoKgReais) }];
  const pesoMesaGramas = filamentos.reduce((t, f) => t + f.g, 0);
  const filamentoMesaCentavos = filamentos.reduce((t, f) => t + (f.g * f.kg * 100) / 1000, 0);
  const perda = opcional(impressao.perdaPercentual);

  const materialCentavos = Math.round((filamentoMesaCentavos * (1 + perda / 100)) / pecas);
  const energiaCentavos = Math.round(
    (horas * numero(impressao.consumoKwh) * opcional(impressao.tarifaEnergiaReais) * 100) / pecas
  );
  const precoImpressora = opcional(impressao.precoImpressoraReais);
  const desgasteCentavos =
    precoImpressora > 0 ? Math.round(((precoImpressora * 100) / numero(impressao.vidaUtilHoras)) * (horas / pecas)) : 0;
  const falhaCentavos = Math.round(
    ((materialCentavos + energiaCentavos + desgasteCentavos) * opcional(impressao.taxaFalhaPercentual)) / 100
  );

  const extras = extrasPorCategoria(impressao);
  const partes = {
    materialCentavos,
    energiaCentavos,
    desgasteCentavos,
    falhaCentavos,
    embalagemCentavos: extras.embalagem,
    acabamentoCentavos: extras.acabamento,
    maoDeObraCentavos: extras.maoDeObra,
    outrosCentavos: extras.outros,
  };
  const totalCentavos = Object.values(partes).reduce((t, v) => t + v, 0);
  return { ...partes, totalCentavos, pecasPorMesa: pecas, horasMesa: horas, pesoMesaGramas };
}

/**
 * Custo da calculadora no formato do cadastro de produto, com o mesmo total:
 * filamento pelo preço médio do kg, acabamento + outros + reserva de falha em
 * acessórios e a mão de obra como 1 h × valor. O cadastro exige todos os
 * campos > 0, por isso os zeros viram R$ 0,01 (ou 1.000.000 h de vida útil).
 */
export function paraCustoProducao(impressao: ImpressaoCalculadora, custo: CustoUnidade): CustoProducao {
  const pecas = custo.pecasPorMesa;
  const pesoPeca = custo.pesoMesaGramas / pecas;
  const perda = opcional(impressao.perdaPercentual);
  // Preço do kg que, com a perda, dá o material já calculado.
  const precoKgCentavos = Math.max(1, Math.round((custo.materialCentavos / (pesoPeca * (1 + perda / 100))) * 1000));
  const precoImpressoraCentavos = Math.round(opcional(impressao.precoImpressoraReais) * 100);
  const tarifaCentavos = Math.round(opcional(impressao.tarifaEnergiaReais) * 100);

  return {
    pesoPecaGramas: Math.round(pesoPeca * 100) / 100,
    tempoImpressaoHoras: Math.round((custo.horasMesa / pecas) * 10000) / 10000,
    tempoMaoDeObraHoras: 1,
    precoCarreteCentavos: precoKgCentavos,
    pesoCarreteGramas: 1000,
    margemPerdaPercentual: perda,
    taxaFalhaPercentual: 0,
    precoImpressoraCentavos: precoImpressoraCentavos > 0 ? precoImpressoraCentavos : 1,
    vidaUtilImpressoraHoras: precoImpressoraCentavos > 0 ? numero(impressao.vidaUtilHoras) : 1_000_000,
    consumoEletricoKwh: numero(impressao.consumoKwh),
    tarifaEnergiaCentavos: tarifaCentavos > 0 ? tarifaCentavos : 1,
    valorHoraTrabalhoCentavos: Math.max(1, custo.maoDeObraCentavos),
    custoEmbalagemCentavos: Math.max(1, custo.embalagemCentavos),
    custoAcessoriosCentavos: custo.acabamentoCentavos + custo.outrosCentavos + custo.falhaCentavos,
  };
}
