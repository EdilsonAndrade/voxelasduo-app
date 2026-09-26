import { describe, expect, it } from "vitest";
import {
  calcularComparativoCanais,
  calcularPrecoEscalaCanal,
  calcularPrecoMinimoCanal,
  calcularPrecoSugeridoCanal,
  calcularResultadoCanal,
  calcularResultadoPisoCanal,
  resolverTaxasCanais,
} from "./canais";
import { calcularPrecoEscala, calcularPrecoSugerido } from "./precificacao";
import { TAXAS_CANAIS_PADRAO } from "@/lib/models/configuracao";

describe("calcularPrecoSugeridoCanal", () => {
  it("é idêntico à fórmula do EDI-92 quando a taxa fixa é zero", () => {
    expect(calcularPrecoSugeridoCanal(2995, 100, { percentual: 18, fixaCentavos: 0 })).toBe(
      calcularPrecoSugerido(2995, 100, 18)
    );
  });

  it("inclui a taxa fixa do canal no preço", () => {
    // (2000 * 2 + 100) / (1 - 0,10) = 4555,55 -> 4556
    expect(calcularPrecoSugeridoCanal(2000, 100, { percentual: 10, fixaCentavos: 100 })).toBe(4556);
  });

  it("retorna null quando a taxa percentual é >= 100", () => {
    expect(calcularPrecoSugeridoCanal(2000, 100, { percentual: 100, fixaCentavos: 0 })).toBeNull();
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
  it("o lucro líquido no preço sugerido equivale à margem desejada sobre o custo", () => {
    const taxa = { percentual: 14, fixaCentavos: 0 };
    const custo = 5000;
    const preco = calcularPrecoSugeridoCanal(custo, 50, taxa);
    const resultado = calcularResultadoCanal("shopee", taxa, preco, custo, 20);

    // lucro esperado = custo * 50% = 2500 (tolerância de 1 centavo por arredondamento)
    expect(Math.abs((resultado.lucroLiquidoCentavos ?? 0) - 2500)).toBeLessThanOrEqual(1);
    expect(resultado.prejuizo).toBe(false);
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
    // lucro 200 sobre custo 4500 -> ~4,4% (< 20%), sem prejuízo
    const baixa = calcularResultadoCanal("shopee", taxa, 5200, 4500, 20);
    expect(baixa.prejuizo).toBe(false);
    expect(baixa.margemBaixa).toBe(true);
  });

  it("a margem é sobre o custo: preço sugerido com 100% não dispara alerta de mínimo 80%", () => {
    const taxa = { percentual: 16.5, fixaCentavos: 0 };
    const resultado = calcularResultadoCanal("mercadoLivre", taxa, 6846, 2858, 80);
    expect(resultado.margemPercentual).toBeCloseTo(100, 0);
    expect(resultado.margemBaixa).toBe(false);
  });

  it("devolve campos nulos quando não há preço válido", () => {
    const resultado = calcularResultadoCanal("shopee", { percentual: 100, fixaCentavos: 0 }, null, 1000, 20);
    expect(resultado.precoSugeridoCentavos).toBeNull();
    expect(resultado.lucroLiquidoCentavos).toBeNull();
    expect(resultado.margemPercentual).toBeNull();
  });
});

describe("resolverTaxasCanais", () => {
  it("usa o padrão global quando não há override", () => {
    const taxas = resolverTaxasCanais(TAXAS_CANAIS_PADRAO);
    expect(taxas.shopee.percentual).toBe(14);
    expect(taxas.siteProprio).toEqual({ percentual: 4.99, fixaCentavos: 0 });
  });

  it("sobrescreve só os campos informados no produto", () => {
    const taxas = resolverTaxasCanais(TAXAS_CANAIS_PADRAO, {
      shopeeTaxaPercentual: 20,
      siteTaxaFixaCentavos: 50,
    });
    expect(taxas.shopee.percentual).toBe(20);
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
    margemDesejadaPercentual: 100,
    lucroEscalaCentavos: 0,
    margemMinimaPercentual: 20,
    mercadoLivre: { percentual: 18, fixaCentavos: 0 },
    shopee: { percentual: 14, fixaCentavos: 0 },
    siteProprio: { percentual: 4.99, fixaCentavos: 0 },
  };

  it("devolve os três canais na ordem ML, Shopee, site próprio", () => {
    const resultado = calcularComparativoCanais(base);
    expect(resultado.map((r) => r.canal)).toEqual(["mercadoLivre", "shopee", "siteProprio"]);
    expect(resultado[0].precoSugeridoCentavos).toBe(7305); // cenário de referência do EDI-92
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
    // (2000 * 1,15 + 100) / (1 - 0,10) = 2666,67 -> 2667
    expect(calcularPrecoMinimoCanal(2000, { percentual: 10, fixaCentavos: 100 }, 15)).toBe(2667);
  });

  it("margem mínima é sobre o custo (custo R$28,58, ML 16,5%, mínimo 80% -> R$61,61)", () => {
    const precoMinimo = calcularPrecoMinimoCanal(2858, { percentual: 16.5, fixaCentavos: 0 }, 80);
    expect(precoMinimo).toBe(6161);
    const lucro = precoMinimo! - Math.round((precoMinimo! * 16.5) / 100) - 2858;
    expect(Math.abs(lucro - 2286)).toBeLessThanOrEqual(1);
  });

  it("retorna null só quando a taxa percentual é >= 100", () => {
    expect(calcularPrecoMinimoCanal(2000, { percentual: 60, fixaCentavos: 0 }, 40)).not.toBeNull();
    expect(calcularPrecoMinimoCanal(2000, { percentual: 100, fixaCentavos: 0 }, 40)).toBeNull();
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
