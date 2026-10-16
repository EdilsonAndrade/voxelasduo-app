/** Capacidade de produção a partir da mesa de impressão cheia. */
export interface ProducaoMensal {
  /** Mesas completas que cabem nas horas trabalhadas do dia (só mesa inteira conta). */
  mesasPorDia: number;
  pecasPorDia: number;
  pecasPorMes: number;
}

/**
 * Quantas peças saem por dia e por mês: `⌊horasDia ÷ horasMesa⌋` mesas por dia,
 * cada uma com `pecasPorMesa` peças. Entradas inválidas (zero/negativas) → `null`.
 */
export function calcularProducaoMensal(entrada: {
  pecasPorMesa: number;
  horasMesaCheia: number;
  horasPorDia: number;
  diasPorMes: number;
}): ProducaoMensal | null {
  const { pecasPorMesa, horasMesaCheia, horasPorDia, diasPorMes } = entrada;
  if (!(pecasPorMesa > 0) || !(horasMesaCheia > 0) || !(horasPorDia > 0) || !(diasPorMes > 0)) {
    return null;
  }

  const mesasPorDia = Math.floor(horasPorDia / horasMesaCheia);
  const pecasPorDia = mesasPorDia * Math.floor(pecasPorMesa);
  return { mesasPorDia, pecasPorDia, pecasPorMes: Math.floor(pecasPorDia * diasPorMes) };
}

/** Taxa de um marketplace numa faixa de preço: percentual + valor fixo por venda. */
export interface FaixaTaxa {
  /** Maior preço da faixa, em centavos (inclusivo) — `null` = sem teto (última faixa). */
  ateCentavos: number | null;
  percentual: number;
  fixaCentavos: number;
}

/**
 * Comissão padrão da Shopee (tabela vigente desde 01/10/2026, já inclui o
 * programa de frete grátis e a taxa de transação). Abaixo de R$ 12 a taxa por
 * item é regressiva (menor) — aqui fica a padrão, o que deixa a conta do lado
 * seguro. Quem precisar de outro valor desliga a faixa automática e digita a taxa.
 */
export const FAIXAS_SHOPEE_2026: FaixaTaxa[] = [
  { ateCentavos: 7999, percentual: 20, fixaCentavos: 450 },
  { ateCentavos: 9999, percentual: 14, fixaCentavos: 1600 },
  { ateCentavos: 19999, percentual: 14, fixaCentavos: 2000 },
  { ateCentavos: null, percentual: 14, fixaCentavos: 2600 },
];

/** Taxa extra por item de vendedor CPF com mais de 450 pedidos em 90 dias. */
export const ADICIONAL_SHOPEE_CPF_CENTAVOS = 300;

/** Faixas da Shopee com o adicional de CPF (quando aplicável) somado à taxa fixa de cada faixa. */
export function faixasShopee(cpfAcima450Pedidos: boolean): FaixaTaxa[] {
  const adicional = cpfAcima450Pedidos ? ADICIONAL_SHOPEE_CPF_CENTAVOS : 0;
  return FAIXAS_SHOPEE_2026.map((f) => ({ ...f, fixaCentavos: f.fixaCentavos + adicional }));
}

/** Mercado Livre: mesma comissão em qualquer preço; o custo fixo por unidade só vale abaixo de R$ 79. */
export function faixasMercadoLivre(percentual: number, custoFixoAbaixo79Centavos: number): FaixaTaxa[] {
  return [
    { ateCentavos: 7899, percentual, fixaCentavos: custoFixoAbaixo79Centavos },
    { ateCentavos: null, percentual, fixaCentavos: 0 },
  ];
}

/** Taxa única, sem faixas (taxa digitada à mão). */
export function faixaUnica(percentual: number, fixaCentavos: number): FaixaTaxa[] {
  return [{ ateCentavos: null, percentual, fixaCentavos }];
}

export function faixaDoPreco(faixas: FaixaTaxa[], precoCentavos: number): FaixaTaxa {
  return faixas.find((f) => f.ateCentavos === null || precoCentavos <= f.ateCentavos) ?? faixas[faixas.length - 1];
}

/**
 * Menor preço que paga custo + taxa da faixa + anúncio + imposto (% do preço) e ainda deixa
 * `margemPrecoPercentual` do preço de lucro: `(custo + fixa) / (1 − taxa% − anúncio% − imposto% − margem%)`.
 * Percorre as faixas da mais barata para a mais cara — se o preço calculado
 * passa do teto da faixa, tenta a seguinte (cujo piso já garante a margem, pois
 * o lucro cresce com o preço dentro da faixa). `null` = não existe preço possível.
 */
export function calcularPrecoPorMargem(entrada: {
  custoCentavos: number;
  faixas: FaixaTaxa[];
  margemPrecoPercentual: number;
  anuncioPercentual: number;
  /** Imposto sobre o preço de venda, em % — ausente = 0. */
  impostoPercentual?: number;
}): number | null {
  const { custoCentavos, faixas, margemPrecoPercentual, anuncioPercentual, impostoPercentual = 0 } = entrada;
  let pisoCentavos = 0;

  for (const faixa of faixas) {
    const divisor = 1 - (faixa.percentual + anuncioPercentual + impostoPercentual + margemPrecoPercentual) / 100;
    if (divisor > 0) {
      const preco = Math.max(Math.ceil((custoCentavos + faixa.fixaCentavos) / divisor), pisoCentavos);
      if (faixa.ateCentavos === null || preco <= faixa.ateCentavos) return preco;
    }
    if (faixa.ateCentavos === null) return null;
    pisoCentavos = faixa.ateCentavos + 1;
  }
  return null;
}

/** Para onde vai cada real de uma venda num preço. */
export interface DetalheVenda {
  faixa: FaixaTaxa;
  taxaCentavos: number;
  anuncioCentavos: number;
  impostoCentavos: number;
  lucroCentavos: number;
  /** Lucro em % do preço de venda. */
  margemPrecoPercentual: number;
}

export function detalharVenda(entrada: {
  precoCentavos: number;
  faixas: FaixaTaxa[];
  custoCentavos: number;
  anuncioPercentual: number;
  impostoPercentual?: number;
}): DetalheVenda {
  const { precoCentavos, faixas, custoCentavos, anuncioPercentual, impostoPercentual = 0 } = entrada;
  const faixa = faixaDoPreco(faixas, precoCentavos);
  const taxaCentavos = Math.round((precoCentavos * faixa.percentual) / 100) + faixa.fixaCentavos;
  const anuncioCentavos = Math.round((precoCentavos * anuncioPercentual) / 100);
  const impostoCentavos = Math.round((precoCentavos * impostoPercentual) / 100);
  const lucroCentavos = precoCentavos - taxaCentavos - anuncioCentavos - impostoCentavos - custoCentavos;
  return {
    faixa,
    taxaCentavos,
    anuncioCentavos,
    impostoCentavos,
    lucroCentavos,
    margemPrecoPercentual: precoCentavos > 0 ? (lucroCentavos / precoCentavos) * 100 : 0,
  };
}

/** Quanto do preço pode ir para anúncio (Ads) sem o lucro cair abaixo da margem mínima. */
export interface LimiteAnuncio {
  /** Preço − taxa da plataforma − custo da peça: o que sobra antes de pagar anúncio. */
  sobraCentavos: number;
  /** Margem mínima aplicada sobre o preço de venda. */
  lucroMinimoCentavos: number;
  /** Máximo de anúncio por venda mantendo a margem mínima — negativo = não cabe anúncio. */
  tetoAnuncioCentavos: number;
  /** Meta de ROAS para a campanha (preço ÷ teto) — `null` quando não cabe anúncio. */
  roasMinimo: number | null;
  /** Abaixo deste ROAS a venda pelo anúncio dá prejuízo (preço ÷ sobra) — `null` quando já não sobra nada. */
  roasPrejuizo: number | null;
}

/**
 * Teto de anúncio e metas de ROAS de um canal (mesma conta da central do
 * Shopee Ads: ROAS mínimo = 1 ÷ margem que sobra para o anúncio). A margem
 * mínima aqui é sobre o preço de venda, como os marketplaces medem.
 */
export function calcularLimiteAnuncio(entrada: {
  precoCentavos: number;
  taxaCentavos: number;
  custoCentavos: number;
  margemMinimaPrecoPercentual: number;
}): LimiteAnuncio {
  const { precoCentavos, taxaCentavos, custoCentavos, margemMinimaPrecoPercentual } = entrada;
  const sobraCentavos = precoCentavos - taxaCentavos - custoCentavos;
  const lucroMinimoCentavos = Math.round((precoCentavos * margemMinimaPrecoPercentual) / 100);
  const tetoAnuncioCentavos = sobraCentavos - lucroMinimoCentavos;

  return {
    sobraCentavos,
    lucroMinimoCentavos,
    tetoAnuncioCentavos,
    roasMinimo: tetoAnuncioCentavos > 0 ? precoCentavos / tetoAnuncioCentavos : null,
    roasPrejuizo: sobraCentavos > 0 ? precoCentavos / sobraCentavos : null,
  };
}

/** Retorno de uma verba de anúncio paga do bolso (fora do preço). */
export interface RetornoVerba {
  /** Vendas que a verba deve gerar com o ROAS informado: verba × ROAS. */
  receitaCentavos: number;
  vendas: number;
  /** Lucro dessas vendas (já com a margem do preço, sem anúncio embutido). */
  lucroVendasCentavos: number;
  /** Lucro das vendas − verba: positivo = o dinheiro do bolso voltou com lucro. */
  saldoCentavos: number;
  /** ROAS a partir do qual a verba se paga (preço ÷ lucro por peça) — `null` sem lucro por peça. */
  roasEquilibrio: number | null;
}

export function calcularRetornoVerba(entrada: {
  verbaCentavos: number;
  roas: number;
  precoCentavos: number;
  lucroPorPecaCentavos: number;
}): RetornoVerba {
  const { verbaCentavos, roas, precoCentavos, lucroPorPecaCentavos } = entrada;
  const receitaCentavos = Math.round(verbaCentavos * roas);
  const vendas = precoCentavos > 0 ? Math.floor(receitaCentavos / precoCentavos) : 0;
  const lucroVendasCentavos = vendas * lucroPorPecaCentavos;
  return {
    receitaCentavos,
    vendas,
    lucroVendasCentavos,
    saldoCentavos: lucroVendasCentavos - verbaCentavos,
    roasEquilibrio: lucroPorPecaCentavos > 0 ? precoCentavos / lucroPorPecaCentavos : null,
  };
}

/**
 * Maior custo de peça que ainda deixa `margemPrecoPercentual` do preço de lucro
 * num preço fixo (ex: o do concorrente), já tirando taxa e anúncio embutido.
 * Negativo = nesse preço não dá nem com custo zero.
 */
export function calcularCustoMaximo(entrada: {
  precoCentavos: number;
  faixas: FaixaTaxa[];
  anuncioPercentual: number;
  margemPrecoPercentual: number;
  impostoPercentual?: number;
}): number {
  const { precoCentavos, faixas, anuncioPercentual, margemPrecoPercentual, impostoPercentual } = entrada;
  const { lucroCentavos } = detalharVenda({ precoCentavos, faixas, custoCentavos: 0, anuncioPercentual, impostoPercentual });
  return lucroCentavos - Math.round((precoCentavos * margemPrecoPercentual) / 100);
}

/** Custo de um kit com `unidades` peças: as peças somadas, mas uma embalagem só. */
export function calcularCustoKit(custoUnidadeCentavos: number, embalagemCentavos: number, unidades: number): number {
  return custoUnidadeCentavos * unidades - embalagemCentavos * (unidades - 1);
}

/** Nosso preço contra o de um concorrente, sempre pagando o anúncio na meta de ROAS. */
export interface ComparacaoConcorrente {
  /** Nosso preço com a margem desejada e o anúncio embutido — `null` = impossível. */
  nossoPrecoCentavos: number | null;
  /** Nosso preço − o dele: positivo = estamos mais caros. */
  diferencaCentavos: number | null;
  /** Lucro e margem (% do preço) se vendermos pelo preço dele, ainda pagando o anúncio. */
  lucroNoPrecoDeleCentavos: number;
  margemNoPrecoDelePercentual: number;
  /** Menor preço que paga custo, taxa e anúncio sem lucro nenhum — `null` = impossível. */
  precoEmpateCentavos: number | null;
}

export function compararComConcorrente(entrada: {
  precoConcorrenteCentavos: number;
  custoCentavos: number;
  faixas: FaixaTaxa[];
  roas: number;
  margemPrecoPercentual: number;
  impostoPercentual?: number;
}): ComparacaoConcorrente {
  const { precoConcorrenteCentavos, custoCentavos, faixas, roas, margemPrecoPercentual, impostoPercentual } = entrada;
  const anuncioPercentual = 100 / roas;
  const base = { custoCentavos, faixas, anuncioPercentual, impostoPercentual };
  const nossoPrecoCentavos = calcularPrecoPorMargem({ ...base, margemPrecoPercentual });
  const venda = detalharVenda({ ...base, precoCentavos: precoConcorrenteCentavos });
  return {
    nossoPrecoCentavos,
    diferencaCentavos: nossoPrecoCentavos !== null ? nossoPrecoCentavos - precoConcorrenteCentavos : null,
    lucroNoPrecoDeleCentavos: venda.lucroCentavos,
    margemNoPrecoDelePercentual: venda.margemPrecoPercentual,
    precoEmpateCentavos: calcularPrecoPorMargem({ ...base, margemPrecoPercentual: 0 }),
  };
}
