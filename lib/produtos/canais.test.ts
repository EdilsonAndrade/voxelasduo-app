import { describe, expect, it } from "vitest";
import {
  calcularComparativoCanais,
  calcularPrecoEscalaCanal,
  calcularPrecoMinimoCanal,
  calcularPrecoPorMarkupCanal,
  calcularPrecoSugeridoCanal,
  calcularResultadoCanal,
  calcularResultadoPisoCanal,
  resolverTaxasCanais,
  comissaoCanal,
  taxaNoPreco,
} from "./canais";
import { calcularPrecoEscala, calcularPrecoSugerido } from "./precificacao";
import { TAXAS_CANAIS_PADRAO } from "@/lib/models/configuracao";

describe("calcularPrecoSugeridoCanal", () => {
  it("é idêntico ao preço sugerido simples quando a taxa fixa é zero", () => {
    expect(calcularPrecoSugeridoCanal(2995, 40, { percentual: 18, fixaCentavos: 0 })).toBe(
      calcularPrecoSugerido(2995, 40, 18)
    );
  });

  it("inclui a taxa fixa do canal no preço", () => {
    // (2000 + 100) / (1 - 0,10 - 0,40) = 4200
    expect(calcularPrecoSugeridoCanal(2000, 40, { percentual: 10, fixaCentavos: 100 })).toBe(4200);
  });

  it("retorna null quando taxa + margem é >= 100", () => {
    expect(calcularPrecoSugeridoCanal(2000, 10, { percentual: 100, fixaCentavos: 0 })).toBeNull();
    expect(calcularPrecoSugeridoCanal(2000, 90, { percentual: 10, fixaCentavos: 0 })).toBeNull();
  });
});

describe("calcularPrecoEscalaCanal", () => {
  it("é idêntico ao preço de escala do EDI-92 sem taxa fixa", () => {
    expect(calcularPrecoEscalaCanal(1500, 300, { percentual: 14, fixaCentavos: 0 })).toBe(
      calcularPrecoEscala(1500, 300, 14)
    );
  });

  it("retorna null quando a taxa percentual é >= 100", () => {
    expect(calcularPrecoEscalaCanal(1500, 300, { percentual: 120, fixaCentavos: 0 })).toBeNull();
  });
});

describe("calcularResultadoCanal", () => {
  it("no preço sugerido o lucro é a margem desejada em % do preço", () => {
    const taxa = { percentual: 14, fixaCentavos: 2000 };
    const custo = 5957;
    const preco = calcularPrecoSugeridoCanal(custo, 40, taxa);
    const resultado = calcularResultadoCanal("shopee", taxa, preco, custo, 25);

    // A comissão é arredondada ao centavo: a margem fica em 40% com folga de centésimos.
    expect(resultado.margemPercentual!).toBeCloseTo(40, 1);
    expect(resultado.markupPercentual!).toBeCloseTo((resultado.lucroLiquidoCentavos! / custo) * 100, 5);
    expect(resultado.margemBaixa).toBe(false);
  });

  it("considera a taxa fixa na comissão", () => {
    const resultado = calcularResultadoCanal(
      "siteProprio",
      { percentual: 5, fixaCentavos: 100 },
      10000,
      4000,
      20
    );
    expect(resultado.comissaoCentavos).toBe(500 + 100);
    expect(resultado.lucroLiquidoCentavos).toBe(10000 - 4000 - 600);
  });

  it("sinaliza prejuízo e margem baixa", () => {
    const taxa = { percentual: 10, fixaCentavos: 0 };
    expect(calcularResultadoCanal("shopee", taxa, 4000, 5000, 20).prejuizo).toBe(true);
    // lucro 180 sobre o preço 5200 -> ~3,5% (< 20%), sem prejuízo
    const baixa = calcularResultadoCanal("shopee", taxa, 5200, 4500, 20);
    expect(baixa.prejuizo).toBe(false);
    expect(baixa.margemBaixa).toBe(true);
  });

  it("a margem é sobre o preço: R$ 130,45 na Shopee com custo R$ 59,57 dá 25%", () => {
    const shopee = resolverTaxasCanais(TAXAS_CANAIS_PADRAO).shopee;
    const resultado = calcularResultadoCanal("shopee", shopee, 13045, 5957, 25);
    expect(resultado.lucroLiquidoCentavos).toBe(3262);
    expect(resultado.margemPercentual).toBeCloseTo(25, 1);
    expect(resultado.markupPercentual).toBeCloseTo(54.8, 1);
  });

  it("devolve campos nulos quando não há preço válido", () => {
    const resultado = calcularResultadoCanal("shopee", { percentual: 100, fixaCentavos: 0 }, null, 1000, 20);
    expect(resultado.precoSugeridoCentavos).toBeNull();
    expect(resultado.lucroLiquidoCentavos).toBeNull();
    expect(resultado.margemPercentual).toBeNull();
  });
});

describe("resolverTaxasCanais", () => {
  it("usa a tabela por faixa da Shopee (não o % global) e o padrão do site quando não há override", () => {
    const taxas = resolverTaxasCanais(TAXAS_CANAIS_PADRAO);
    expect(taxaNoPreco(taxas.shopee, 3500)).toMatchObject({ percentual: 20, fixaCentavos: 450 });
    expect(taxaNoPreco(taxas.shopee, 15000)).toMatchObject({ percentual: 14, fixaCentavos: 2000 });
    expect(taxas.siteProprio).toEqual({ percentual: 4.99, fixaCentavos: 0 });
  });

  it("sobrescreve só os campos informados no produto", () => {
    const taxas = resolverTaxasCanais(TAXAS_CANAIS_PADRAO, {
      shopeeTaxaPercentual: 20,
      siteTaxaFixaCentavos: 50,
    });
    expect(taxaNoPreco(taxas.shopee, 15000)).toMatchObject({ percentual: 20, fixaCentavos: 2000 });
    expect(taxas.siteProprio).toEqual({ percentual: 4.99, fixaCentavos: 50 });
  });

  it("um override vazio herda tudo do global", () => {
    expect(resolverTaxasCanais(TAXAS_CANAIS_PADRAO, {})).toEqual(resolverTaxasCanais(TAXAS_CANAIS_PADRAO));
  });
});

describe("calcularComparativoCanais", () => {
  const base = {
    custoBaseCentavos: 2995,
    modo: "completo" as const,
    margemDesejadaPercentual: 40,
    lucroEscalaCentavos: 0,
    margemMinimaPercentual: 20,
    mercadoLivre: { percentual: 18, fixaCentavos: 0 },
    shopee: { percentual: 14, fixaCentavos: 0 },
    siteProprio: { percentual: 4.99, fixaCentavos: 0 },
  };

  it("devolve os três canais na ordem ML, Shopee, site próprio", () => {
    const resultado = calcularComparativoCanais(base);
    expect(resultado.map((r) => r.canal)).toEqual(["mercadoLivre", "shopee", "siteProprio"]);
    expect(resultado[0].precoSugeridoCentavos).toBe(calcularPrecoSugerido(2995, 40, 18));
  });

  it("canal com menor taxa tem preço sugerido menor", () => {
    const [ml, shopee, site] = calcularComparativoCanais(base);
    expect(site.precoSugeridoCentavos!).toBeLessThan(shopee.precoSugeridoCentavos!);
    expect(shopee.precoSugeridoCentavos!).toBeLessThan(ml.precoSugeridoCentavos!);
  });

  it("usa o preço de escala no modo escala", () => {
    const [ml] = calcularComparativoCanais({
      ...base,
      modo: "escala",
      custoBaseCentavos: 1500,
      lucroEscalaCentavos: 300,
    });
    expect(ml.precoSugeridoCentavos).toBe(calcularPrecoEscala(1500, 300, 18));
  });
});

describe("calcularPrecoMinimoCanal", () => {
  it("com margem mínima 0% é o breakeven (sem lucro nem prejuízo)", () => {
    const taxa = { percentual: 10, fixaCentavos: 0 };
    const precoMinimo = calcularPrecoMinimoCanal(9000, taxa, 0);
    // no piso, a comissão sobre o preço mínimo cobre exatamente a diferença até o custo
    const comissao = Math.round((precoMinimo! * taxa.percentual) / 100);
    expect(precoMinimo! - comissao).toBe(9000);
  });

  it("inclui a taxa fixa no piso", () => {
    // (2000 + 100) / (1 - 0,10 - 0,25) = 3230,77 -> 3231
    expect(calcularPrecoMinimoCanal(2000, { percentual: 10, fixaCentavos: 100 }, 25)).toBe(3231);
  });

  it("o piso é % do preço: no preço mínimo o lucro é o piso do preço", () => {
    const precoMinimo = calcularPrecoMinimoCanal(2858, { percentual: 16.5, fixaCentavos: 0 }, 25)!;
    const lucro = precoMinimo - Math.round((precoMinimo * 16.5) / 100) - 2858;
    expect(lucro / precoMinimo).toBeGreaterThanOrEqual(0.2499);
  });

  it("retorna null quando taxa + piso é >= 100", () => {
    expect(calcularPrecoMinimoCanal(2000, { percentual: 60, fixaCentavos: 0 }, 30)).not.toBeNull();
    expect(calcularPrecoMinimoCanal(2000, { percentual: 60, fixaCentavos: 0 }, 40)).toBeNull();
  });
});

describe("calcularPrecoPorMarkupCanal", () => {
  it("mantém a régua antiga (% sobre o custo) para converter margens gravadas", () => {
    // (2000 * 2 + 100) / (1 - 0,10) = 4555,55 -> 4556
    expect(calcularPrecoPorMarkupCanal(2000, 100, { percentual: 10, fixaCentavos: 100 })).toBe(4556);
  });
});

describe("calcularResultadoPisoCanal", () => {
  it("calcula desconto máximo em R$ e % a partir do preço atual", () => {
    const precoMinimo = calcularPrecoMinimoCanal(2000, { percentual: 10, fixaCentavos: 0 }, 15);
    const resultado = calcularResultadoPisoCanal("mercadoLivre", 5000, precoMinimo);

    expect(resultado.precoMinimoCentavos).toBe(precoMinimo);
    expect(resultado.descontoMaximoCentavos).toBe(5000 - precoMinimo!);
    expect(resultado.descontoMaximoPercentual).toBeCloseTo(((5000 - precoMinimo!) / 5000) * 100);
  });

  it("desconto negativo quando o preço atual já está abaixo do mínimo", () => {
    const resultado = calcularResultadoPisoCanal("shopee", 1000, 1500);
    expect(resultado.descontoMaximoCentavos).toBe(-500);
  });

  it("devolve campos nulos quando o preço mínimo é null", () => {
    const resultado = calcularResultadoPisoCanal("siteProprio", 5000, null);
    expect(resultado.descontoMaximoCentavos).toBeNull();
    expect(resultado.descontoMaximoPercentual).toBeNull();
  });
});

describe("Shopee por faixa (pedido real: R$ 35 → taxas R$ 11,50, repasse R$ 23,50)", () => {
  const shopee = resolverTaxasCanais(TAXAS_CANAIS_PADRAO).shopee;

  it("cobra 20% + R$ 4,50 até R$ 79,99", () => {
    expect(comissaoCanal(shopee, 3500)).toBe(1150);
  });

  it("o preço sugerido pula para a faixa seguinte quando passa do teto", () => {
    // Custo alto: em 20% + 4,50 o preço passaria de R$ 79,99, então usa 14% + R$ 16.
    const preco = calcularPrecoSugeridoCanal(6000, 0, shopee)!;
    expect(preco).toBe(Math.max(8000, Math.round((6000 + 1600) / 0.86)));
    expect(calcularResultadoCanal("shopee", shopee, preco, 6000, 0).taxa).toMatchObject({ percentual: 14, fixaCentavos: 1600 });
  });
});
