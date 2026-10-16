import { describe, expect, it } from "vitest";
import type { CalculadoraValores } from "@/lib/models/calculoPreco";
import { valoresPadrao } from "./calculadoraPadrao";
import { normalizarValores } from "./calculadoraValores";
import { calcularCustoUnidade } from "./custoCalculadora";
import { calcularCustoKit, calcularPrecoPorMargem, faixasShopee } from "./calculadoraRapida";
import { idsDaQuery, montarOrcamentoProduto } from "./orcamento";

/** Mesa de 4 peças em 5 h, 200 g. */
function valores(extra: Partial<CalculadoraValores> = {}): CalculadoraValores {
  const padrao = valoresPadrao();
  return {
    ...padrao,
    impressao: { ...padrao.impressao, pecasPorMesa: "4", tempoHoras: "5", tempoMinutos: "0", pesoGramas: "200" },
    pecasPorMes: "",
    ...extra,
  };
}

function custoDe(v: CalculadoraValores) {
  return calcularCustoUnidade(normalizarValores(v).impressao)!;
}

describe("montarOrcamentoProduto", () => {
  it("avulso e kit no preço que embute o anúncio na meta de ROAS (padrão 8)", () => {
    const v = valores();
    const o = montarOrcamentoProduto(v, "shopee", 3);
    const custo = custoDe(v);

    expect(o.custoPecaCentavos).toBe(custo.totalCentavos);
    expect(o.roas).toBe(8);
    expect(o.linhas.map((l) => l.unidades)).toEqual([1, 3]);
    expect(o.linhas[0].precoCentavos).toBe(
      calcularPrecoPorMargem({
        custoCentavos: custo.totalCentavos,
        faixas: faixasShopee(false),
        margemPrecoPercentual: 25,
        anuncioPercentual: 12.5,
      })
    );
    expect(o.linhas[1].custoPedidoCentavos).toBe(calcularCustoKit(custo.totalCentavos, custo.embalagemCentavos, 3));
    // 4 mesas/dia × 4 peças × 30 dias = 480 peças → 160 kits de 3
    expect(o.pecasMes).toBe(480);
    expect(o.linhas[1].pedidosMes).toBe(160);
    expect(o.linhas[0].lucroMesCentavos).toBe(o.linhas[0].lucroPedidoCentavos * 480);
    expect(Math.round(o.linhas[0].margemPercentual)).toBe(25);
  });

  it("abre cálculo antigo (custo por peça) convertido", () => {
    const padrao = valoresPadrao();
    const antigo: CalculadoraValores = {
      ...padrao,
      versao: undefined,
      impressao: undefined,
      custo: {
        pesoPecaGramas: "50", tempoImpressaoHoras: "2", tempoMaoDeObraHoras: "1", precoCarreteReais: "100", pesoCarreteGramas: "1000",
        margemPerdaPercentual: "0", taxaFalhaPercentual: "", precoImpressoraReais: "3070", vidaUtilImpressoraHoras: "4000",
        consumoEletricoKwh: "0.15", tarifaEnergiaReais: "0.90", valorHoraTrabalhoReais: "1", custoEmbalagemReais: "5", custoAcessoriosReais: "",
      },
      producao: { pecasPorMesa: "", horasMesaCheia: "", horasPorDia: "20", diasPorMes: "30" },
    };
    const o = montarOrcamentoProduto(antigo, "shopee", 2);
    expect(o.custoPecaCentavos).toBeGreaterThan(0);
    expect(o.pecasPorMesa).toBe(1);
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

  it("traz preço e vendas do concorrente quando informados", () => {
    const o = montarOrcamentoProduto(valores({ precoConcorrenteReais: "29,90", precoConcorrenteOfertaReais: "24,90", vendasConcorrenteMes: "150" }), "shopee", 2);
    expect(o.precoConcorrenteCentavos).toBe(2990);
    expect(o.vendasConcorrenteMes).toBe(150);
    expect(o.precoOfertaConcorrenteCentavos).toBe(2490);
    expect(montarOrcamentoProduto(valores(), "shopee", 2).vendasConcorrenteMes).toBeNull();
  });

  it("custo incompleto → sem linhas", () => {
    const v = valores();
    const o = montarOrcamentoProduto({ ...v, impressao: { ...v.impressao!, pesoGramas: "" } }, "shopee", 2);
    expect(o.custoPecaCentavos).toBeNull();
    expect(o.linhas).toEqual([]);
  });

  it("sem horas por dia → mês em branco", () => {
    const o = montarOrcamentoProduto(valores({ producao: { horasPorDia: "", diasPorMes: "30" } }), "shopee", 2);
    expect(o.pecasMes).toBeNull();
    expect(o.linhas[0].lucroMesCentavos).toBeNull();
  });

  it("imposto entra na conta do preço", () => {
    const v = valores();
    const sem = montarOrcamentoProduto(v, "shopee", 2).linhas[0].precoCentavos!;
    const com = montarOrcamentoProduto({ ...v, precificacao: { ...v.precificacao!, impostoPercentual: "6" } }, "shopee", 2).linhas[0].precoCentavos!;
    expect(com).toBeGreaterThan(sem);
  });

  it("margem impossível → sem preço", () => {
    const o = montarOrcamentoProduto(valores({ margemMinimaPrecoPercentual: "90" }), "shopee", 2);
    expect(o.linhas[0].precoCentavos).toBeNull();
  });
});

describe("idsDaQuery", () => {
  it("tira vazios e repetidos mantendo a ordem", () => {
    expect(idsDaQuery("b, a,,b,c")).toEqual(["b", "a", "c"]);
    expect(idsDaQuery(undefined)).toEqual([]);
  });
});
