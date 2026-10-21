import { describe, expect, it } from "vitest";
import type { Produto } from "@/lib/models/produto";
import { valoresDoProduto } from "./calculadoraDoProduto";
import { calcularCustoUnidade } from "./custoCalculadora";
import { calcularCustoProducao } from "./custoProducao";

const custoProducao = {
  pesoPecaGramas: 40,
  tempoImpressaoHoras: 1.5,
  tempoMaoDeObraHoras: 0.25,
  precoCarreteCentavos: 10000,
  pesoCarreteGramas: 1000,
  margemPerdaPercentual: 5,
  precoImpressoraCentavos: 307000,
  vidaUtilImpressoraHoras: 4000,
  consumoEletricoKwh: 0.15,
  tarifaEnergiaCentavos: 90,
  valorHoraTrabalhoCentavos: 2000,
  custoEmbalagemCentavos: 150,
};

function produto(parcial: Partial<Produto> = {}): Produto {
  return {
    nome: "Gato",
    slug: "gato",
    descricao: "",
    preco: 3990,
    fotos: [],
    estoque: 0,
    categoria: "decoracao",
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...parcial,
  };
}

describe("valoresDoProduto", () => {
  it("leva o custo do cadastro para a impressão com o mesmo total (sem taxa de falha)", () => {
    const valores = valoresDoProduto(produto({ custoProducao }));
    const custo = calcularCustoUnidade(valores.impressao);
    expect(custo?.totalCentavos).toBe(calcularCustoProducao(custoProducao).totalCentavos);
  });

  it("usa o preço da Shopee como preço alvo, ou o do site sem preço próprio", () => {
    expect(valoresDoProduto(produto({ precosCanais: { shopee: 4590 } })).precificacao).toMatchObject({ modo: "alvo", precoAlvoReais: "45.90" });
    expect(valoresDoProduto(produto()).precificacao).toMatchObject({ modo: "alvo", precoAlvoReais: "39.90" });
  });

  it("sem custo cadastrado começa com a impressão padrão", () => {
    expect(valoresDoProduto(produto()).impressao.pesoGramas).toBe("");
  });
});
