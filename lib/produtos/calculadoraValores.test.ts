import { describe, expect, it } from "vitest";
import type { CalculadoraValores } from "@/lib/models/calculoPreco";
import { VAZIO_CUSTO_PRODUCAO } from "./custoProducaoFormulario";
import { horasDaMesa, normalizarValores, separarHoras, valoresPadraoV2 } from "./calculadoraValores";

function legado(parcial: Partial<CalculadoraValores> = {}): CalculadoraValores {
  return {
    custo: {
      ...VAZIO_CUSTO_PRODUCAO,
      pesoPecaGramas: "40",
      tempoImpressaoHoras: "1.5",
      tempoMaoDeObraHoras: "0.25",
      valorHoraTrabalhoReais: "20",
      precoCarreteReais: "100",
      pesoCarreteGramas: "1000",
      custoEmbalagemReais: "1.50",
    },
    margemMinimaPrecoPercentual: "25",
    canais: {
      shopee: { taxaPercentual: "20", taxaFixaReais: "4.50", taxaPorFaixa: true, cpfAcima450Pedidos: true },
      mercadoLivre: { taxaPercentual: "14", taxaFixaReais: "6.50" },
    },
    producao: { pecasPorMesa: "", horasMesaCheia: "", horasPorDia: "20", diasPorMes: "30" },
    pecasPorMes: "",
    ...parcial,
  };
}

describe("separarHoras / horasDaMesa", () => {
  it("1,5 h = 1 h 30 min e volta", () => {
    expect(separarHoras(1.5)).toEqual({ tempoHoras: "1", tempoMinutos: "30" });
    expect(horasDaMesa({ tempoHoras: "1", tempoMinutos: "30" })).toBe(1.5);
  });
  it("minutos acima de 60 viram horas e vazio é null", () => {
    expect(horasDaMesa({ tempoHoras: "", tempoMinutos: "90" })).toBe(1.5);
    expect(horasDaMesa({ tempoHoras: "", tempoMinutos: "" })).toBeNull();
  });
});

describe("normalizarValores", () => {
  it("cálculo antigo sem mesa: 1 peça, tempo e peso da peça, mão de obra vira extra com a embalagem", () => {
    const v = normalizarValores(legado());
    expect(v.versao).toBe(2);
    expect("custo" in v).toBe(false);
    expect(v.impressao).toMatchObject({ pecasPorMesa: "1", tempoHoras: "1", tempoMinutos: "30", pesoGramas: "40", precoKgReais: "100.00" });
    expect(v.impressao.extras).toEqual([
      { item: "Embalagem", quantidade: "1", precoReais: "1.50", categoria: "embalagem" },
      { item: "Mão de obra", quantidade: "1", precoReais: "5.00", categoria: "maoDeObra" },
    ]);
    expect(v.canais.shopee.tipoConta).toBe("cpf");
    expect(v.precificacao.modo).toBe("margem");
    expect(v.vendaDireta.pagamento).toBe("pix");
  });

  it("cálculo antigo com mesa: peças e tempo da mesa, peso multiplicado", () => {
    const v = normalizarValores(
      legado({ producao: { pecasPorMesa: "4", horasMesaCheia: "5", horasPorDia: "20", diasPorMes: "30" } })
    );
    expect(v.impressao).toMatchObject({ pecasPorMesa: "4", tempoHoras: "5", tempoMinutos: "0", pesoGramas: "160" });
  });

  it("cálculo v2 passa direto", () => {
    const novo = valoresPadraoV2();
    expect(normalizarValores(novo)).toEqual(novo);
  });
});
