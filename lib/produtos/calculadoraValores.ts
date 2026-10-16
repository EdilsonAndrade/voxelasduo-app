import type {
  CalculadoraValores,
  CalculadoraValoresV2,
  ExtraCalculadora,
  ImpressaoCalculadora,
  PrecificacaoCalculadora,
  VendaDiretaCalculadora,
} from "@/lib/models/calculoPreco";

/**
 * Valores da calculadora na versão 2 (impressão da mesa, extras por categoria,
 * precificação e venda direta) e a conversão dos cálculos salvos antes dela.
 * Fica fora de `"use client"` porque a página (server) e o orçamento impresso
 * também convertem.
 */

export const IMPRESSAO_PADRAO: ImpressaoCalculadora = {
  impressora: "a1",
  consumoKwh: "0.11",
  tarifaEnergiaReais: "0.90",
  precoImpressoraReais: "3070.00",
  vidaUtilHoras: "4000",
  pecasPorMesa: "1",
  tempoHoras: "",
  tempoMinutos: "",
  perdaPercentual: "0",
  taxaFalhaPercentual: "2",
  pesoGramas: "",
  precoKgReais: "100.00",
  filamentos: [],
  embalagemReais: "5.00",
  extras: [],
};

export const PRECIFICACAO_PADRAO: PrecificacaoCalculadora = {
  modo: "margem",
  precoAlvoReais: "",
  impostoPercentual: "0",
  promocaoAtiva: false,
  promocaoPercentual: "",
};

export const VENDA_DIRETA_PADRAO: VendaDiretaCalculadora = {
  pagamento: "pix",
  taxaPixPercentual: "0",
  taxaOutraPercentual: "",
  frete: "cobrado",
  custoEnvioReais: "",
};

function numero(texto: string | undefined): number {
  return Number((texto ?? "").trim().replace(",", "."));
}

function positivo(texto: string | undefined): number | null {
  const n = numero(texto);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Número sem zeros sobrando, com até `casas` decimais (ex: 1.5, 12, 0.33). */
function texto(n: number, casas = 2): string {
  return String(Math.round(n * 10 ** casas) / 10 ** casas);
}

/** Horas decimais → horas e minutos inteiros (1.5 → "1" e "30"). */
export function separarHoras(horas: number): { tempoHoras: string; tempoMinutos: string } {
  if (!(horas > 0)) return { tempoHoras: "", tempoMinutos: "" };
  let h = Math.floor(horas);
  let m = Math.round((horas - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return { tempoHoras: String(h), tempoMinutos: String(m) };
}

/** Horas + minutos digitados → horas decimais (minutos ≥ 60 viram horas). `null` = vazio ou inválido. */
export function horasDaMesa(impressao: Pick<ImpressaoCalculadora, "tempoHoras" | "tempoMinutos">): number | null {
  const h = impressao.tempoHoras.trim() === "" ? 0 : numero(impressao.tempoHoras);
  const m = impressao.tempoMinutos.trim() === "" ? 0 : numero(impressao.tempoMinutos);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) return null;
  const total = h + m / 60;
  return total > 0 ? total : null;
}

/** Converte o custo por peça da versão 1 para a impressão da mesa (data-model.md). */
function impressaoDoLegado(valores: CalculadoraValores): ImpressaoCalculadora {
  const c = valores.custo;
  if (!c) return IMPRESSAO_PADRAO;

  const pecasLegado = positivo(valores.producao?.pecasPorMesa);
  const horasMesaLegado = positivo(valores.producao?.horasMesaCheia);
  const usaMesa = pecasLegado !== null && horasMesaLegado !== null;
  const pecas = usaMesa ? Math.floor(pecasLegado) || 1 : 1;
  const horas = usaMesa ? horasMesaLegado : (positivo(c.tempoImpressaoHoras) ?? 0);
  const pesoPeca = positivo(c.pesoPecaGramas);

  const carretel = positivo(c.pesoCarreteGramas) ?? 1000;
  const precoCarretel = positivo(c.precoCarreteReais);

  const extras: ExtraCalculadora[] = [];
  const maoDeObra = (positivo(c.tempoMaoDeObraHoras) ?? 0) * (positivo(c.valorHoraTrabalhoReais) ?? 0);
  if (maoDeObra > 0) {
    extras.push({ item: "Mão de obra", quantidade: "1", precoReais: maoDeObra.toFixed(2), categoria: "maoDeObra" });
  }
  const acessorios = positivo(c.custoAcessoriosReais);
  if (acessorios !== null) {
    extras.push({ item: "Acessórios", quantidade: "1", precoReais: acessorios.toFixed(2), categoria: "outros" });
  }
  const embalagem = positivo(c.custoEmbalagemReais);
  // Com a lista preenchida o campo simples deixa de valer: a embalagem vai junto para não sumir do custo.
  if (extras.length > 0 && embalagem !== null) {
    extras.unshift({ item: "Embalagem", quantidade: "1", precoReais: embalagem.toFixed(2), categoria: "embalagem" });
  }

  return {
    ...IMPRESSAO_PADRAO,
    impressora: "outra",
    consumoKwh: c.consumoEletricoKwh || IMPRESSAO_PADRAO.consumoKwh,
    tarifaEnergiaReais: c.tarifaEnergiaReais || IMPRESSAO_PADRAO.tarifaEnergiaReais,
    precoImpressoraReais: c.precoImpressoraReais ?? IMPRESSAO_PADRAO.precoImpressoraReais,
    vidaUtilHoras: c.vidaUtilImpressoraHoras ?? IMPRESSAO_PADRAO.vidaUtilHoras,
    pecasPorMesa: String(pecas),
    ...separarHoras(horas),
    perdaPercentual: c.margemPerdaPercentual?.trim() ? c.margemPerdaPercentual : "0",
    taxaFalhaPercentual: c.taxaFalhaPercentual?.trim() ? c.taxaFalhaPercentual : "0",
    pesoGramas: pesoPeca !== null ? texto(pesoPeca * pecas) : "",
    precoKgReais: precoCarretel !== null ? ((precoCarretel / carretel) * 1000).toFixed(2) : IMPRESSAO_PADRAO.precoKgReais,
    filamentos: [],
    embalagemReais: embalagem !== null ? embalagem.toFixed(2) : "",
    extras,
  };
}

/**
 * Valores prontos para a versão 2: cálculos novos passam direto (completando o
 * que faltar); os antigos têm o custo por peça convertido para a mesa, a mão de
 * obra e os acessórios viram custos extras e a Shopee ganha o tipo de conta.
 */
export function normalizarValores(valores: CalculadoraValores): CalculadoraValoresV2 {
  const ehV2 = valores.versao === 2 && valores.impressao !== undefined;
  const impressao: ImpressaoCalculadora = ehV2
    ? { ...IMPRESSAO_PADRAO, ...valores.impressao, filamentos: valores.impressao!.filamentos ?? [], extras: valores.impressao!.extras ?? [] }
    : impressaoDoLegado(valores);

  const shopee = valores.canais.shopee;
  // O custo legado sai do objeto (não fica `undefined`, que o banco gravaria como null).
  const { custo: _legado, ...resto } = valores;
  void _legado;
  return {
    ...resto,
    versao: 2,
    impressao,
    precificacao: { ...PRECIFICACAO_PADRAO, ...valores.precificacao },
    vendaDireta: { ...VENDA_DIRETA_PADRAO, ...valores.vendaDireta },
    canais: {
      ...valores.canais,
      shopee: {
        ...shopee,
        tipoConta: shopee.tipoConta ?? "cpf",
        campanhaDestaque: shopee.campanhaDestaque ?? false,
        campanhaPercentual: shopee.campanhaPercentual ?? "2",
        cupomAtivo: shopee.cupomAtivo ?? false,
        cupomReais: shopee.cupomReais ?? "",
      },
    },
    producao: { horasPorDia: valores.producao.horasPorDia, diasPorMes: valores.producao.diasPorMes },
  };
}

/** Cálculo novo, já na versão 2. */
export function valoresPadraoV2(): CalculadoraValoresV2 {
  return normalizarValores({
    versao: 2,
    impressao: IMPRESSAO_PADRAO,
    precificacao: PRECIFICACAO_PADRAO,
    vendaDireta: VENDA_DIRETA_PADRAO,
    margemMinimaPrecoPercentual: "25",
    anuncio: { modo: "sem", roasMeta: "8", verbaMesReais: "" },
    canais: {
      shopee: { taxaPercentual: "20", taxaFixaReais: "4.50", taxaPorFaixa: true },
      mercadoLivre: { taxaPercentual: "14", taxaFixaReais: "6.50" },
    },
    producao: { horasPorDia: "20", diasPorMes: "30" },
    pecasPorMes: "",
  });
}
