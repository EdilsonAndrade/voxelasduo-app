import { describe, expect, it } from "vitest";
import {
  calcularCustoKit,
  calcularCustoMaximo,
  compararComConcorrente,
  FAIXAS_SHOPEE_2026,
  calcularLimiteAnuncio,
  calcularPrecoPorMargem,
  calcularProducaoMensal,
  calcularRetornoVerba,
  detalharVenda,
  faixaUnica,
  faixasMercadoLivre,
  faixasShopee,
} from "./calculadoraRapida";

describe("calcularProducaoMensal", () => {
  it("conta só mesas inteiras no dia", () => {
    expect(
      calcularProducaoMensal({ pecasPorMesa: 8, horasMesaCheia: 3, horasPorDia: 20, diasPorMes: 30 })
    ).toEqual({ mesasPorDia: 6, pecasPorDia: 48, pecasPorMes: 1440 });
  });

  it("devolve null com entrada inválida", () => {
    expect(
      calcularProducaoMensal({ pecasPorMesa: 0, horasMesaCheia: 3, horasPorDia: 20, diasPorMes: 30 })
    ).toBeNull();
  });
});

describe("calcularPrecoPorMargem", () => {
  it("venda direta (sem taxa e sem anúncio): só custo ÷ (1 − margem)", () => {
    const preco = calcularPrecoPorMargem({
      custoCentavos: 1104,
      faixas: faixaUnica(0, 0),
      margemPrecoPercentual: 25,
      anuncioPercentual: 0,
    });
    expect(preco).toBe(1472);
  });

  it("Shopee abaixo de R$ 80: 20% + R$ 4,50, 25% do preço de lucro, sem anúncio", () => {
    const preco = calcularPrecoPorMargem({
      custoCentavos: 1104,
      faixas: FAIXAS_SHOPEE_2026,
      margemPrecoPercentual: 25,
      anuncioPercentual: 0,
    });
    expect(preco).toBe(2826);
    const venda = detalharVenda({ precoCentavos: preco!, faixas: FAIXAS_SHOPEE_2026, custoCentavos: 1104, anuncioPercentual: 0 });
    expect(venda.margemPrecoPercentual).toBeGreaterThanOrEqual(24.99);
  });

  it("anúncio embutido (ROAS 8 = 12,5%) sobe o preço e mantém os 25%", () => {
    const preco = calcularPrecoPorMargem({
      custoCentavos: 1104,
      faixas: FAIXAS_SHOPEE_2026,
      margemPrecoPercentual: 25,
      anuncioPercentual: 12.5,
    });
    expect(preco).toBe(3657);
  });

  it("pula para a faixa seguinte quando o preço passa do teto da faixa", () => {
    // Na 1ª faixa daria R$ 82,73 (> R$ 79,99); na 2ª (14% + R$ 16) fecha em R$ 93,45.
    const preco = calcularPrecoPorMargem({
      custoCentavos: 4100,
      faixas: FAIXAS_SHOPEE_2026,
      margemPrecoPercentual: 25,
      anuncioPercentual: 0,
    });
    expect(preco).toBe(9345);
    const venda = detalharVenda({ precoCentavos: 9345, faixas: FAIXAS_SHOPEE_2026, custoCentavos: 4100, anuncioPercentual: 0 });
    expect(venda.faixa.fixaCentavos).toBe(1600);
    expect(venda.margemPrecoPercentual).toBeGreaterThanOrEqual(24.99);
  });

  it("Mercado Livre cobra o custo fixo só abaixo de R$ 79", () => {
    const faixas = faixasMercadoLivre(14, 650);
    expect(detalharVenda({ precoCentavos: 5000, faixas, custoCentavos: 0, anuncioPercentual: 0 }).taxaCentavos).toBe(1350);
    expect(detalharVenda({ precoCentavos: 10000, faixas, custoCentavos: 0, anuncioPercentual: 0 }).taxaCentavos).toBe(1400);
  });

  it("sem preço possível quando taxa + anúncio + margem chegam a 100%", () => {
    expect(
      calcularPrecoPorMargem({ custoCentavos: 1000, faixas: faixaUnica(50, 0), margemPrecoPercentual: 25, anuncioPercentual: 25 })
    ).toBeNull();
  });
});

describe("faixasShopee", () => {
  it("CPF com mais de 450 pedidos em 90 dias paga R$ 3 a mais por item em todas as faixas", () => {
    expect(faixasShopee(false)[0].fixaCentavos).toBe(450);
    expect(faixasShopee(true).map((f) => f.fixaCentavos)).toEqual([750, 1900, 2300, 2900]);
  });

  it("bate com os exemplos da tabela: R$ 15 → R$ 7,50 e R$ 100 → R$ 34,00", () => {
    const faixas = faixasShopee(false);
    expect(detalharVenda({ precoCentavos: 1500, faixas, custoCentavos: 0, anuncioPercentual: 0 }).taxaCentavos).toBe(750);
    expect(detalharVenda({ precoCentavos: 10000, faixas, custoCentavos: 0, anuncioPercentual: 0 }).taxaCentavos).toBe(3400);
  });
});

describe("calcularLimiteAnuncio", () => {
  it("teto de anúncio e ROAS para manter 25% do preço (exemplo Shopee R$ 40)", () => {
    const r = calcularLimiteAnuncio({
      precoCentavos: 4000,
      taxaCentavos: 1200,
      custoCentavos: 1000,
      margemMinimaPrecoPercentual: 25,
    });
    expect(r.sobraCentavos).toBe(1800);
    expect(r.tetoAnuncioCentavos).toBe(800);
    expect(r.roasMinimo).toBe(5);
    expect(r.roasPrejuizo).toBeCloseTo(2.22, 2);
  });

  it("sem espaço para anúncio quando a sobra não cobre a margem mínima", () => {
    const r = calcularLimiteAnuncio({
      precoCentavos: 2000,
      taxaCentavos: 800,
      custoCentavos: 1000,
      margemMinimaPrecoPercentual: 25,
    });
    expect(r.tetoAnuncioCentavos).toBe(-300);
    expect(r.roasMinimo).toBeNull();
    expect(r.roasPrejuizo).toBe(10);
  });
});

describe("calcularRetornoVerba", () => {
  it("R$ 100 do bolso com ROAS 8 num produto de R$ 27,35 que dá R$ 6,84 de lucro", () => {
    const r = calcularRetornoVerba({ verbaCentavos: 10000, roas: 8, precoCentavos: 2735, lucroPorPecaCentavos: 684 });
    expect(r.receitaCentavos).toBe(80000);
    expect(r.vendas).toBe(29);
    expect(r.lucroVendasCentavos).toBe(19836);
    expect(r.saldoCentavos).toBe(9836);
    expect(r.roasEquilibrio).toBeCloseTo(4, 1);
  });
});

describe("concorrente e kit", () => {
  it("a R$ 12,48 na Shopee, com 25% de lucro, a peça pode custar no máximo R$ 2,36", () => {
    expect(
      calcularCustoMaximo({ precoCentavos: 1248, faixas: FAIXAS_SHOPEE_2026, anuncioPercentual: 0, margemPrecoPercentual: 25 })
    ).toBe(236);
  });

  it("kit de 3 soma as peças com uma embalagem só", () => {
    expect(calcularCustoKit(767, 250, 3)).toBe(1801);
  });
});

describe("compararComConcorrente", () => {
  it("diz quanto estamos acima e qual margem sobra no preço dele pagando o ROAS", () => {
    const faixas = faixaUnica(20, 0);
    const c = compararComConcorrente({
      precoConcorrenteCentavos: 3000,
      custoCentavos: 1000,
      faixas,
      roas: 10,
      margemPrecoPercentual: 25,
    });
    // 1000 / (1 − 0,20 − 0,10 − 0,25) = 2222,2 → 2223
    expect(c.nossoPrecoCentavos).toBe(2223);
    expect(c.diferencaCentavos).toBe(-777);
    // 3000 − 600 taxa − 300 anúncio − 1000 custo = 1100 → 36,7%
    expect(c.lucroNoPrecoDeleCentavos).toBe(1100);
    expect(c.margemNoPrecoDelePercentual).toBeCloseTo(36.67, 1);
    // 1000 / 0,7 = 1428,6 → 1429
    expect(c.precoEmpateCentavos).toBe(1429);
  });
});
