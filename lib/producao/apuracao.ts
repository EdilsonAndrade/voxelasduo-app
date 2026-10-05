import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import type { CustoProducao, Produto } from "@/lib/models/produto";
import type { Impressao, VinculoArquivoProduto } from "@/lib/models/producao";

/** Abaixo disto a taxa de falha observada não é conclusão, é ruído (FR-024). */
export const AMOSTRA_MINIMA = 10;

export interface ApuracaoParte {
  nomeArquivo: string;
  parte: string;
  rendimentoPorPlaca: number;
  unidadesPorProduto: number;
  /** Impressões concluídas × rendimento. */
  unidadesProduzidas: number;
  impressoesConcluidas: number;
  impressoesInterrompidas: number;
  gramasPorUnidade?: number;
  horasPorUnidade?: number;
  /** Filamento + depreciação + energia por unidade **da parte**, em centavos. */
  custoParteCentavos?: number;
  /** Unidades da parte que sobraram além dos conjuntos completos. */
  excedente: number;
  /** Quanto ainda pode virar estoque nesta parte (FR-034). */
  saldoLancavel: number;
}

export interface ApuracaoProduto {
  produtoId: string;
  produtoNome: string;
  unidadesAcabadas: number;
  gramasPorPeca?: number;
  horasPorPeca?: number;
  custoApuradoCentavos?: number;
  custoCadastradoCentavos?: number;
  diferencaCentavos?: number;
  /** `true` quando alguma parte mapeada ainda não tem impressão concluída (FR-023). */
  parcial: boolean;
  partesSemDados: string[];
  /** `true` quando o produto não tem `custoProducao` cadastrado — sem ele não há custo apurado. */
  semCustoCadastrado: boolean;
  taxaFalhaObservada?: number;
  amostra: number;
  amostraPequena: boolean;
  perdaObservadaPercentual?: number;
  gramasPerdidosEmFalhas: number;
  valorPerdidoEmFalhasCentavos?: number;
  /** Conjuntos completos ainda disponíveis para lançar no estoque (FR-038). */
  conjuntosLancaveis: number;
  partes: ApuracaoParte[];
}

/**
 * Saldo que uma impressão ainda pode lançar no estoque.
 *
 * Zero para impressão histórica (o estoque atual já a reflete, FR-038) e para
 * interrompida (não produziu peça, FR-022).
 */
export function saldoLancavel(
  impressao: Pick<
    Impressao,
    "resultado" | "historico" | "quantidadeLancada" | "quantidadePerdida"
  >,
  vinculo: Pick<VinculoArquivoProduto, "rendimentoPorPlaca"> | null
): number {
  if (!vinculo) return 0;
  if (impressao.historico) return 0;
  if (impressao.resultado !== "concluida") return 0;

  const usado = (impressao.quantidadeLancada ?? 0) + (impressao.quantidadePerdida ?? 0);
  return Math.max(0, vinculo.rendimentoPorPlaca - usado);
}

function somar(valores: number[]): number {
  return valores.reduce((total, valor) => total + valor, 0);
}

/**
 * Custo por unidade da parte: só o que escala com a impressão (filamento,
 * depreciação e energia).
 *
 * Duas escolhas importantes (research.md #4):
 * - `margemPerdaPercentual` é zerada: o peso relatado pelo fatiador **já
 *   inclui** a purga, então aplicar a margem do cadastro contaria a perda
 *   duas vezes.
 * - `taxaFalhaPercentual` é zerada: o apurado é o custo do que realmente
 *   saiu; a falha é indicador à parte (FR-024), aplicável ao cadastro pelo
 *   vendedor.
 */
function custoDaParte(
  cadastro: CustoProducao,
  gramasPorUnidade: number | undefined,
  horasPorUnidade: number | undefined
): number | undefined {
  if (gramasPorUnidade === undefined && horasPorUnidade === undefined) return undefined;

  const resultado = calcularCustoProducao({
    ...cadastro,
    pesoPecaGramas: gramasPorUnidade ?? 0,
    tempoImpressaoHoras: horasPorUnidade ?? 0,
    margemPerdaPercentual: 0,
    taxaFalhaPercentual: 0,
    tempoMaoDeObraHoras: 0,
    custoEmbalagemCentavos: 0,
    custoAcessoriosCentavos: 0,
  });

  return (
    resultado.custoFilamentoCentavos +
    resultado.custoDepreciacaoCentavos +
    resultado.custoEnergiaCentavos
  );
}

/** Componentes que valem **uma vez por produto acabado**, nunca por parte. */
function custoPorProdutoAcabado(cadastro: CustoProducao): number {
  return (
    Math.round(cadastro.tempoMaoDeObraHoras * cadastro.valorHoraTrabalhoCentavos) +
    Math.round(cadastro.custoEmbalagemCentavos) +
    Math.round(cadastro.custoAcessoriosCentavos ?? 0)
  );
}

function valorPorGramaCentavos(cadastro: CustoProducao): number {
  return cadastro.pesoCarreteGramas > 0
    ? cadastro.precoCarreteCentavos / cadastro.pesoCarreteGramas
    : 0;
}

/**
 * Apura a produção de um produto a partir das impressões dos seus vínculos.
 *
 * Função pura: recebe o produto, os vínculos e as impressões já carregados, e
 * nada persiste. Toda a regra de "quantas peças saíram" e "quanto custou de
 * verdade" vive aqui, testada sem banco.
 */
export function apurarProduto(
  produto: Produto,
  vinculos: VinculoArquivoProduto[],
  impressoes: Impressao[]
): ApuracaoProduto {
  const cadastro = produto.custoProducao;
  const porNome = new Map<string, Impressao[]>();
  for (const impressao of impressoes) {
    const lista = porNome.get(impressao.nomeArquivo) ?? [];
    lista.push(impressao);
    porNome.set(impressao.nomeArquivo, lista);
  }

  const partes: ApuracaoParte[] = vinculos.map((vinculo) => {
    const daParte = porNome.get(vinculo.nomeArquivo) ?? [];
    const concluidas = daParte.filter((i) => i.resultado === "concluida");
    const interrompidas = daParte.filter((i) => i.resultado === "interrompida");

    const comGramas = concluidas.filter((i) => (i.gramas ?? 0) > 0);
    const comDuracao = concluidas.filter((i) => (i.duracaoSegundos ?? 0) > 0);

    const gramasPorUnidade =
      comGramas.length > 0
        ? somar(comGramas.map((i) => i.gramas!)) / (comGramas.length * vinculo.rendimentoPorPlaca)
        : undefined;

    const horasPorUnidade =
      comDuracao.length > 0
        ? somar(comDuracao.map((i) => i.duracaoSegundos!)) /
          3600 /
          (comDuracao.length * vinculo.rendimentoPorPlaca)
        : undefined;

    return {
      nomeArquivo: vinculo.nomeArquivo,
      parte: vinculo.parte,
      rendimentoPorPlaca: vinculo.rendimentoPorPlaca,
      unidadesPorProduto: vinculo.unidadesPorProduto,
      unidadesProduzidas: concluidas.length * vinculo.rendimentoPorPlaca,
      impressoesConcluidas: concluidas.length,
      impressoesInterrompidas: interrompidas.length,
      gramasPorUnidade,
      horasPorUnidade,
      custoParteCentavos: cadastro
        ? custoDaParte(cadastro, gramasPorUnidade, horasPorUnidade)
        : undefined,
      excedente: 0, // preenchido abaixo, quando as unidades acabadas são conhecidas
      saldoLancavel: somar(daParte.map((i) => saldoLancavel(i, vinculo))),
    };
  });

  // Unidades acabadas: limitadas pela parte mais escassa (FR-022). 10 bases +
  // 4 tampas são 4 produtos, não 10.
  const unidadesAcabadas =
    partes.length === 0
      ? 0
      : Math.floor(
          Math.min(...partes.map((p) => p.unidadesProduzidas / p.unidadesPorProduto))
        );

  for (const parte of partes) {
    parte.excedente = Math.max(
      0,
      parte.unidadesProduzidas - unidadesAcabadas * parte.unidadesPorProduto
    );
  }

  const partesSemDados = partes.filter((p) => p.impressoesConcluidas === 0).map((p) => p.parte);
  const temTodasAsPartes = partesSemDados.length === 0 && partes.length > 0;

  // Só há número por peça quando **todas** as partes têm o dado: senão o
  // resultado seria uma soma com zeros disfarçados de medição.
  const temGramasDeTodas =
    temTodasAsPartes && partes.every((p) => p.gramasPorUnidade !== undefined);
  const temHorasDeTodas =
    temTodasAsPartes && partes.every((p) => p.horasPorUnidade !== undefined);

  const gramasPorPeca = temGramasDeTodas
    ? somar(partes.map((p) => p.gramasPorUnidade! * p.unidadesPorProduto))
    : undefined;
  const horasPorPeca = temHorasDeTodas
    ? somar(partes.map((p) => p.horasPorUnidade! * p.unidadesPorProduto))
    : undefined;

  // O custo apurado precisa de peso **e** duração: sem a duração faltariam
  // depreciação e energia, e o número sairia otimista sem avisar.
  const custoApuradoCentavos =
    cadastro && temGramasDeTodas && temHorasDeTodas
      ? somar(partes.map((p) => (p.custoParteCentavos ?? 0) * p.unidadesPorProduto)) +
        custoPorProdutoAcabado(cadastro)
      : undefined;

  const custoCadastradoCentavos = cadastro
    ? calcularCustoProducao(cadastro).totalCentavos
    : undefined;

  const totalImpressoes = impressoes.length;
  const interrompidasTotal = impressoes.filter((i) => i.resultado === "interrompida").length;
  const gramasPerdidosEmFalhas = somar(
    impressoes.filter((i) => i.resultado === "interrompida").map((i) => i.gramas ?? 0)
  );

  const perdaObservadaPercentual =
    gramasPorPeca !== undefined && cadastro && cadastro.pesoPecaGramas > 0
      ? (gramasPorPeca / cadastro.pesoPecaGramas - 1) * 100
      : undefined;

  return {
    produtoId: produto._id!.toString(),
    produtoNome: produto.nome,
    unidadesAcabadas,
    gramasPorPeca,
    horasPorPeca,
    custoApuradoCentavos,
    custoCadastradoCentavos,
    diferencaCentavos:
      custoApuradoCentavos !== undefined && custoCadastradoCentavos !== undefined
        ? custoApuradoCentavos - custoCadastradoCentavos
        : undefined,
    parcial: partesSemDados.length > 0,
    partesSemDados,
    semCustoCadastrado: !cadastro,
    taxaFalhaObservada: totalImpressoes > 0 ? interrompidasTotal / totalImpressoes : undefined,
    amostra: totalImpressoes,
    amostraPequena: totalImpressoes > 0 && totalImpressoes < AMOSTRA_MINIMA,
    perdaObservadaPercentual,
    gramasPerdidosEmFalhas,
    valorPerdidoEmFalhasCentavos: cadastro
      ? Math.round(gramasPerdidosEmFalhas * valorPorGramaCentavos(cadastro))
      : undefined,
    conjuntosLancaveis:
      partes.length === 0
        ? 0
        : Math.floor(Math.min(...partes.map((p) => p.saldoLancavel / p.unidadesPorProduto))),
    partes,
  };
}

/**
 * Campos de `custoProducao` que o vendedor pode aplicar ao cadastro a partir
 * do apurado (FR-027). Devolve só o que foi efetivamente apurado — nunca
 * sobrescreve um campo com valor ausente.
 */
export function camposParaAplicar(apuracao: ApuracaoProduto): Partial<CustoProducao> {
  const campos: Partial<CustoProducao> = {};
  if (apuracao.gramasPorPeca !== undefined) {
    campos.pesoPecaGramas = Number(apuracao.gramasPorPeca.toFixed(2));
  }
  if (apuracao.horasPorPeca !== undefined) {
    campos.tempoImpressaoHoras = Number(apuracao.horasPorPeca.toFixed(2));
  }
  if (apuracao.taxaFalhaObservada !== undefined && !apuracao.amostraPequena) {
    campos.taxaFalhaPercentual = Number((apuracao.taxaFalhaObservada * 100).toFixed(1));
  }
  return campos;
}
