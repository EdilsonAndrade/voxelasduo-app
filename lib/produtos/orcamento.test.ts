import { describe, expect, it } from "vitest";
import type { CalculadoraValores } from "@/lib/models/calculoPreco";
import { valoresPadrao } from "./calculadoraPadrao";
import { calcularCustoProducao } from "./custoProducao";
import { montarCustoProducao } from "./custoProducaoFormulario";
import { calcularCustoKit, calcularPrecoPorMargem, faixasShopee } from "./calculadoraRapida";
import { faixasDoCanal, idsDaQuery, montarOrcamentoProduto } from "./orcamento";

function valores(extra: Partial<CalculadoraValores> = {}): CalculadoraValores {
  const padrao = valoresPadrao();
  return {
    ...padrao,
    custo: { ...padrao.custo, tempoImpressaoHoras: "2", pesoPecaGramas: "50" },
    producao: { pecasPorMesa: "4", horasMesaCheia: "5", horasPorDia: "20", diasPorMes: "30" },
    pecasPorMes: "",
    ...extra,
  };
}

describe("montarOrcamentoProduto", () => {
  it("avulso e kit no preço que embute o anúncio na meta de ROAS (padrão 8)", () => {
    const v = valores();
    const o = montarOrcamentoProduto(v, "shopee", 3);
    const cogs = calcularCustoProducao(montarCustoProducao(v.custo)!);

    expect(o.custoPecaCentavos).toBe(cogs.totalCentavos);
    expect(o.roas).toBe(8);
    expect(o.linhas.map((l) => l.unidades)).toEqual([1, 3]);
    expect(o.linhas[0].precoCentavos).toBe(
      calcularPrecoPorMargem({
        custoCentavos: cogs.totalCentavos,
        faixas: faixasShopee(false),
        margemPrecoPercentual: 25,
        anuncioPercentual: 12.5,
      })
    );
    expect(o.linhas[1].custoPedidoCentavos).toBe(calcularCustoKit(cogs.totalCentavos, cogs.custoEmbalagemCentavos, 3));
    // 4 mesas/dia × 4 peças × 30 dias = 480 peças → 160 kits de 3
    expect(o.pecasMes).toBe(480);
    expect(o.linhas[1].pedidosMes).toBe(160);
    expect(o.linhas[0].lucroMesCentavos).toBe(o.linhas[0].lucroPedidoCentavos * 480);
    expect(Math.round(o.linhas[0].margemPercentual)).toBe(25);
  });

  it("usa a meta de ROAS e as peças no mês gravadas no cálculo", () => {
    const o = montarOrcamentoProduto(
      valores({ anuncio: { modo: "sem", roasMeta: "10", verbaMesReais: "" }, pecasPorMes: "100" }),
      "mercadoLivre",
      2
    );
    expect(o.roas).toBe(10);
    expect(o.pecasMes).toBe(100);
    expect(o.linhas[1].pedidosMes).toBe(50);
  });

  it("custo incompleto → sem linhas", () => {
    const v = valores();
    const o = montarOrcamentoProduto({ ...v, custo: { ...v.custo, pesoPecaGramas: "" } }, "shopee", 2);
    expect(o.custoPecaCentavos).toBeNull();
    expect(o.linhas).toEqual([]);
  });

  it("sem produção → mês em branco", () => {
    const o = montarOrcamentoProduto(
      valores({ producao: { pecasPorMesa: "", horasMesaCheia: "", horasPorDia: "20", diasPorMes: "30" } }),
      "shopee",
      2
    );
    expect(o.pecasMes).toBeNull();
    expect(o.linhas[0].lucroMesCentavos).toBeNull();
  });

  it("margem impossível → sem preço", () => {
    const o = montarOrcamentoProduto(valores({ margemMinimaPrecoPercentual: "90" }), "shopee", 2);
    expect(o.linhas[0].precoCentavos).toBeNull();
  });
});

describe("faixasDoCanal", () => {
  it("Mercado Livre com custo fixo só abaixo de R$ 79", () => {
    expect(faixasDoCanal("mercadoLivre", valoresPadrao().canais)).toEqual([
      { ateCentavos: 7899, percentual: 14, fixaCentavos: 650 },
      { ateCentavos: null, percentual: 14, fixaCentavos: 0 },
    ]);
  });
});

describe("idsDaQuery", () => {
  it("tira vazios e repetidos mantendo a ordem", () => {
    expect(idsDaQuery("b, a,,b,c")).toEqual(["b", "a", "c"]);
    expect(idsDaQuery(undefined)).toEqual([]);
  });
});
